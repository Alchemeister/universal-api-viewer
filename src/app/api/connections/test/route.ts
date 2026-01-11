import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'
import { ProviderId } from '@/types/providers'

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
        { success: false, error: 'Provider and credentials are required' },
        { status: 400 }
      )
    }

    const providerConfig = getProvider(provider as ProviderId)
    if (!providerConfig) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Test the connection
    const result = await providerConfig.testConnection(credentials)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}
