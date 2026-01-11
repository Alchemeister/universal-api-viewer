import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      .from('alerts')
      .select('*')
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
    const { type, provider, threshold_cents } = body

    if (!type || !threshold_cents) {
      return NextResponse.json(
        { error: 'Type and threshold are required' },
        { status: 400 }
      )
    }

    if (!['budget', 'provider', 'anomaly'].includes(type)) {
      return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 })
    }

    if (type === 'provider' && !provider) {
      return NextResponse.json(
        { error: 'Provider is required for provider alerts' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        type,
        provider: type === 'provider' ? provider : null,
        threshold_cents,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
