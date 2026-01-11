import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/encryption'
import { getProvider } from '@/lib/providers'
import { ProviderId } from '@/types/providers'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('connections')
      .select('id, provider, is_active, last_synced_at, last_error, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, credentials } = body

    if (!provider || !credentials) {
      return NextResponse.json(
        { error: 'Provider and credentials are required' },
        { status: 400 }
      )
    }

    // Verify provider exists
    const providerConfig = getProvider(provider as ProviderId)
    if (!providerConfig) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Connection for this provider already exists' },
        { status: 400 }
      )
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials)

    // Create connection
    const { data, error } = await supabase
      .from('connections')
      .insert({
        user_id: user.id,
        provider,
        credentials: encryptedCredentials,
        is_active: true,
      })
      .select('id, provider, is_active, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
