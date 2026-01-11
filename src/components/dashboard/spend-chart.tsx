'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { DailySpend, ProviderId } from '@/types/providers'

const providerColors: Record<ProviderId, string> = {
  openai: '#10A37F',
  anthropic: '#D4A574',
  vercel: '#FFFFFF',
  stripe: '#635BFF',
  supabase: '#3ECF8E',
  'google-cloud': '#4285F4',
  aws: '#FF9900',
  planetscale: '#000000',
  resend: '#000000',
  twilio: '#F22F46',
}

interface SpendChartProps {
  data: DailySpend[]
  type?: 'area' | 'bar'
  title?: string
}

export function SpendChart({
  data,
  type = 'area',
  title = 'Daily Spend',
}: SpendChartProps) {
  const chartData = useMemo(() => {
    return data.map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      total: day.total / 100, // Convert cents to dollars for display
      ...Object.fromEntries(
        Object.entries(day.byProvider).map(([k, v]) => [k, v / 100])
      ),
    }))
  }, [data])

  const providers = useMemo(() => {
    const allProviders = new Set<ProviderId>()
    data.forEach((day) => {
      Object.keys(day.byProvider).forEach((p) =>
        allProviders.add(p as ProviderId)
      )
    })
    return Array.from(allProviders)
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="mb-2 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="font-mono">
                {formatCurrency(entry.value * 100)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#totalGradient)"
                  name="Total"
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                {providers.map((provider) => (
                  <Bar
                    key={provider}
                    dataKey={provider}
                    stackId="a"
                    fill={providerColors[provider]}
                    name={provider}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
