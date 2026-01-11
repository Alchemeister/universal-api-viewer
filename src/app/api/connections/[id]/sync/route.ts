import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptCredentials } from '@/lib/encryption'
import { getProvider } from '@/lib/providers'
import { ProviderId } from '@/types/providers'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get connection with credentials
    const { data: connection, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (connError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const provider = getProvider(connection.provider as ProviderId)
    if (!provider) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Decrypt credentials
    let credentials: Record<string, string>
    try {
      credentials = decryptCredentials(connection.credentials)
    } catch (error) {
      await supabase
        .from('connections')
        .update({ last_error: 'Failed to decrypt credentials' })
        .eq('id', id)

      return NextResponse.json(
        { error: 'Failed to decrypt credentials' },
        { status: 500 }
      )
    }

    // Calculate date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // Fetch usage data
    let usageData
    try {
      usageData = await provider.fetchUsage(credentials, startDate, endDate)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch usage'
      await supabase
        .from('connections')
        .update({
          last_error: errorMessage,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', id)

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    // Upsert usage records
    if (usageData.length > 0) {
      const records = usageData.map((record) => ({
        connection_id: id,
        user_id: user.id,
        provider: connection.provider,
        date: record.date,
        amount_cents: record.amountCents,
        currency: record.currency,
        raw_data: record.rawData || null,
      }))

      // Upsert each record (update if exists, insert if not)
      for (const record of records) {
        await supabase
          .from('usage_records')
          .upsert(record, { onConflict: 'connection_id,date' })
      }
    }

    // Update connection last_synced_at
    await supabase
      .from('connections')
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      recordsCount: usageData.length,
    })
  } catch (error) {
    console.error('Error syncing connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
