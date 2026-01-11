'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, calculatePercentChange } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, DollarSign, Wallet, AlertTriangle } from 'lucide-react'

const iconMap = {
  'dollar-sign': DollarSign,
  'trending-up': TrendingUp,
  'wallet': Wallet,
  'alert-triangle': AlertTriangle,
}

type IconName = keyof typeof iconMap

interface StatsCardProps {
  title: string
  value: number
  previousValue?: number
  isCurrency?: boolean
  icon?: IconName
  description?: string
}

export function StatsCard({
  title,
  value,
  previousValue,
  isCurrency = true,
  icon,
  description,
}: StatsCardProps) {
  const Icon = icon ? iconMap[icon] : null
  const percentChange = previousValue
    ? calculatePercentChange(value, previousValue)
    : 0

  const TrendIcon =
    percentChange > 0 ? TrendingUp : percentChange < 0 ? TrendingDown : Minus

  const trendColor =
    percentChange > 0
      ? 'text-red-400' // Higher spend is typically bad
      : percentChange < 0
      ? 'text-green-400'
      : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isCurrency ? formatCurrency(value) : value.toLocaleString()}
        </div>
        {previousValue !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(percentChange)}% from last month</span>
          </div>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
