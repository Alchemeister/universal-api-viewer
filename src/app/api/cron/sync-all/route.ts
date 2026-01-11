import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { decryptCredentials } from '@/lib/encryption'
import { getProvider } from '@/lib/providers'
import { ProviderId } from '@/types/providers'

// Vercel Cron: runs daily at 6 AM UTC
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all active connections
  const { data: connections, error: connError } = await supabase
    .from('connections')
    .select('*')
    .eq('is_active', true)

  if (connError || !connections) {
    console.error('Failed to fetch connections:', connError)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }

  console.log(`[Cron] Syncing ${connections.length} connections`)

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }

  // Process each connection
  for (const connection of connections) {
    try {
      const provider = getProvider(connection.provider as ProviderId)
      if (!provider) {
        console.error(`[Cron] Unknown provider: ${connection.provider}`)
        results.failed++
        results.errors.push(`Unknown provider: ${connection.provider}`)
        continue
      }

      // Decrypt credentials
      let credentials: Record<string, string>
      try {
        credentials = decryptCredentials(connection.credentials)
      } catch (error) {
        console.error(`[Cron] Failed to decrypt credentials for ${connection.id}`)
        await supabase
          .from('connections')
          .update({ last_error: 'Failed to decrypt credentials' })
          .eq('id', connection.id)
        results.failed++
        continue
      }

      // Calculate date range (last 7 days for daily sync)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      // Fetch usage data
      let usageData
      try {
        usageData = await provider.fetchUsage(credentials, startDate, endDate)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch usage'
        console.error(`[Cron] Failed to fetch usage for ${connection.id}:`, errorMessage)
        await supabase
          .from('connections')
          .update({
            last_error: errorMessage,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', connection.id)
        results.failed++
        continue
      }

      // Upsert usage records
      if (usageData.length > 0) {
        for (const record of usageData) {
          await supabase.from('usage_records').upsert(
            {
              connection_id: connection.id,
              user_id: connection.user_id,
              provider: connection.provider,
              date: record.date,
              amount_cents: record.amountCents,
              currency: record.currency,
              raw_data: record.rawData || null,
            },
            { onConflict: 'connection_id,date' }
          )
        }
      }

      // Update connection
      await supabase
        .from('connections')
        .update({
          last_synced_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', connection.id)

      results.success++
      console.log(`[Cron] Synced ${connection.provider} (${usageData.length} records)`)
    } catch (error) {
      console.error(`[Cron] Unexpected error for ${connection.id}:`, error)
      results.failed++
    }
  }

  console.log(`[Cron] Complete. Success: ${results.success}, Failed: ${results.failed}`)

  return NextResponse.json({
    message: 'Sync complete',
    ...results,
  })
}
