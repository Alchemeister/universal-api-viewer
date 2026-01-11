import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { formatCurrency } from '@/lib/utils'

// Vercel Cron: runs every 6 hours
export const dynamic = 'force-dynamic'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface Alert {
  id: string
  user_id: string
  type: 'budget' | 'provider' | 'anomaly'
  provider: string | null
  threshold_cents: number
  is_active: boolean
  last_triggered_at: string | null
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get current month start
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  // Get all active alerts
  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_active', true)

  if (alertsError || !alerts) {
    console.error('[Alerts] Failed to fetch alerts:', alertsError)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }

  console.log(`[Alerts] Checking ${alerts.length} alerts`)

  const triggered: Array<{
    alertId: string
    type: string
    provider: string | null
    threshold: number
    actual: number
    userEmail?: string
  }> = []

  for (const alert of alerts as Alert[]) {
    try {
      let currentSpend = 0

      if (alert.type === 'budget') {
        // Total spend for the month
        const { data: usage } = await supabase
          .from('usage_records')
          .select('amount_cents')
          .eq('user_id', alert.user_id)
          .gte('date', monthStart)

        currentSpend = usage?.reduce((sum, r) => sum + r.amount_cents, 0) || 0
      } else if (alert.type === 'provider' && alert.provider) {
        // Provider-specific spend
        const { data: usage } = await supabase
          .from('usage_records')
          .select('amount_cents')
          .eq('user_id', alert.user_id)
          .eq('provider', alert.provider)
          .gte('date', monthStart)

        currentSpend = usage?.reduce((sum, r) => sum + r.amount_cents, 0) || 0
      } else if (alert.type === 'anomaly') {
        // Get today's spend vs average
        const today = now.toISOString().split('T')[0]
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

        const { data: todayUsage } = await supabase
          .from('usage_records')
          .select('amount_cents')
          .eq('user_id', alert.user_id)
          .eq('date', today)

        const { data: historyUsage } = await supabase
          .from('usage_records')
          .select('amount_cents')
          .eq('user_id', alert.user_id)
          .gte('date', thirtyDaysAgo)
          .lt('date', today)

        const todaySpend = todayUsage?.reduce((sum, r) => sum + r.amount_cents, 0) || 0
        const historyTotal = historyUsage?.reduce((sum, r) => sum + r.amount_cents, 0) || 0
        const avgDaily = historyTotal / 30

        // Check if today's spend is X times the average
        if (avgDaily > 0 && todaySpend > avgDaily * (alert.threshold_cents / 100)) {
          currentSpend = todaySpend
        }
      }

      // Check if threshold exceeded
      if (currentSpend >= alert.threshold_cents) {
        // Check cooldown (don't trigger more than once per day)
        if (alert.last_triggered_at) {
          const lastTriggered = new Date(alert.last_triggered_at)
          const hoursSince = (now.getTime() - lastTriggered.getTime()) / (1000 * 60 * 60)
          if (hoursSince < 24) {
            continue
          }
        }

        // Get user email from auth.users using admin API
        let userEmail: string | undefined
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id)
          userEmail = userData?.user?.email || undefined
        } catch (e) {
          console.error('[Alerts] Failed to get user email:', e)
        }

        triggered.push({
          alertId: alert.id,
          type: alert.type,
          provider: alert.provider,
          threshold: alert.threshold_cents,
          actual: currentSpend,
          userEmail,
        })

        // Record trigger
        await supabase.from('alert_history').insert({
          alert_id: alert.id,
          amount_cents: currentSpend,
          message: `${alert.type} alert triggered: ${formatCurrency(currentSpend)} exceeds threshold of ${formatCurrency(alert.threshold_cents)}`,
        })

        // Update last_triggered_at
        await supabase
          .from('alerts')
          .update({ last_triggered_at: now.toISOString() })
          .eq('id', alert.id)

        // Send email notification
        if (resend && userEmail) {
          try {
            await resend.emails.send({
              from: 'DevCosts <alerts@devcosts.com>',
              to: userEmail,
              subject: `DevCosts Alert: ${alert.type === 'budget' ? 'Budget' : alert.provider} threshold exceeded`,
              html: `
                <h2>Budget Alert Triggered</h2>
                <p>Your ${alert.type === 'budget' ? 'total' : alert.provider} spend has exceeded your configured threshold.</p>
                <ul>
                  <li><strong>Current spend:</strong> ${formatCurrency(currentSpend)}</li>
                  <li><strong>Threshold:</strong> ${formatCurrency(alert.threshold_cents)}</li>
                </ul>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">View Dashboard</a></p>
              `,
            })
          } catch (emailError) {
            console.error('[Alerts] Failed to send email:', emailError)
          }
        }
      }
    } catch (error) {
      console.error(`[Alerts] Error processing alert ${alert.id}:`, error)
    }
  }

  console.log(`[Alerts] Triggered ${triggered.length} alerts`)

  return NextResponse.json({
    message: 'Alert check complete',
    triggered: triggered.length,
  })
}
