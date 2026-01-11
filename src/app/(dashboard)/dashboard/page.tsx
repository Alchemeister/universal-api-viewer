import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ProviderCard } from '@/components/dashboard/provider-card'
import { SpendChart } from '@/components/dashboard/spend-chart'
import { BudgetProgress } from '@/components/dashboard/budget-progress'
import { ConnectionWithUsage, DailySpend, ProviderId } from '@/types/providers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

async function getDashboardData(userId: string) {
  const supabase = await createClient()

  // Get current month start and end
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Fetch connections
  const { data: connections } = await supabase
    .from('connections')
    .select('*')
    .eq('user_id', userId)

  // Fetch current month usage
  const { data: currentUsage } = await supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', currentMonthStart.toISOString().split('T')[0])

  // Fetch last month usage
  const { data: lastUsage } = await supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', lastMonthStart.toISOString().split('T')[0])
    .lte('date', lastMonthEnd.toISOString().split('T')[0])

  // Calculate totals
  const currentMonthTotal =
    currentUsage?.reduce((sum, r) => sum + r.amount_cents, 0) || 0
  const lastMonthTotal =
    lastUsage?.reduce((sum, r) => sum + r.amount_cents, 0) || 0

  // Calculate projected spend (linear extrapolation)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedSpend = Math.round(
    (currentMonthTotal / dayOfMonth) * daysInMonth
  )

  // Group usage by provider for current month
  const usageByProvider: Record<string, { current: number; previous: number }> = {}
  connections?.forEach((conn) => {
    usageByProvider[conn.provider] = { current: 0, previous: 0 }
  })

  currentUsage?.forEach((record) => {
    if (usageByProvider[record.provider]) {
      usageByProvider[record.provider].current += record.amount_cents
    }
  })

  lastUsage?.forEach((record) => {
    if (usageByProvider[record.provider]) {
      usageByProvider[record.provider].previous += record.amount_cents
    }
  })

  // Build connection stats
  const connectionStats: ConnectionWithUsage[] =
    connections?.map((conn) => {
      const usage = usageByProvider[conn.provider] || { current: 0, previous: 0 }
      const percentChange =
        usage.previous > 0
          ? Math.round(((usage.current - usage.previous) / usage.previous) * 100)
          : 0

      return {
        id: conn.id,
        provider: conn.provider as ProviderId,
        isActive: conn.is_active,
        lastSyncedAt: conn.last_synced_at,
        lastError: conn.last_error,
        currentMonthSpend: usage.current,
        previousMonthSpend: usage.previous,
        percentChange,
      }
    }) || []

  // Build daily spend data for chart (last 30 days)
  const dailySpend: DailySpend[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const dayRecords = currentUsage?.filter((r) => r.date === dateStr) || []
    const byProvider: Record<ProviderId, number> = {} as Record<ProviderId, number>
    let total = 0

    dayRecords.forEach((record) => {
      byProvider[record.provider as ProviderId] =
        (byProvider[record.provider as ProviderId] || 0) + record.amount_cents
      total += record.amount_cents
    })

    dailySpend.push({ date: dateStr, total, byProvider })
  }

  return {
    totalSpendThisMonth: currentMonthTotal,
    totalSpendLastMonth: lastMonthTotal,
    projectedMonthEnd: projectedSpend,
    connectionStats,
    dailySpend,
    connectionCount: connections?.length || 0,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const data = await getDashboardData(user.id)

  // Default budget (user can set this in settings)
  const budgetLimit = 50000 // $500 default

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        subtitle={`Welcome back! Here's your API spend overview.`}
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Spend This Month"
            value={data.totalSpendThisMonth}
            previousValue={data.totalSpendLastMonth}
            icon="dollar-sign"
          />
          <StatsCard
            title="Projected Month End"
            value={data.projectedMonthEnd}
            icon="trending-up"
            description="Based on current usage rate"
          />
          <StatsCard
            title="Connected Providers"
            value={data.connectionCount}
            isCurrency={false}
            icon="wallet"
          />
          <StatsCard
            title="Active Alerts"
            value={0}
            isCurrency={false}
            icon="alert-triangle"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart - takes 2 columns */}
          <div className="lg:col-span-2">
            <SpendChart data={data.dailySpend} title="Daily Spend (Last 30 Days)" />
          </div>

          {/* Budget Progress */}
          <BudgetProgress
            currentSpend={data.totalSpendThisMonth}
            budgetLimit={budgetLimit}
            projectedSpend={data.projectedMonthEnd}
          />
        </div>

        {/* Provider Cards */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected Providers</h2>
            <Link href="/connections">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </Link>
          </div>

          {data.connectionStats.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.connectionStats.map((connection) => (
                <ProviderCard
                  key={connection.id}
                  connection={connection}
                  totalSpend={data.totalSpendThisMonth}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-lg font-medium">No providers connected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your first API provider to start tracking costs.
              </p>
              <Link href="/connections">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
