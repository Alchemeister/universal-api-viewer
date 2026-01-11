'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle } from 'lucide-react'

interface BudgetProgressProps {
  currentSpend: number
  budgetLimit: number
  projectedSpend: number
}

export function BudgetProgress({
  currentSpend,
  budgetLimit,
  projectedSpend,
}: BudgetProgressProps) {
  const percentUsed = Math.min((currentSpend / budgetLimit) * 100, 100)
  const projectedPercent = Math.min((projectedSpend / budgetLimit) * 100, 150)

  const getStatusColor = () => {
    if (percentUsed >= 100) return 'bg-red-500'
    if (percentUsed >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusBadge = () => {
    if (percentUsed >= 100) return <Badge variant="danger">Over Budget</Badge>
    if (percentUsed >= 75) return <Badge variant="warning">Warning</Badge>
    return <Badge variant="success">On Track</Badge>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Monthly Budget</CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Spend</span>
            <span className="font-medium">{formatCurrency(currentSpend)}</span>
          </div>
          <Progress
            value={percentUsed}
            className="h-3"
            indicatorClassName={getStatusColor()}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(percentUsed)}% of budget</span>
            <span>Limit: {formatCurrency(budgetLimit)}</span>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>Projected End of Month</span>
            </div>
            <span
              className={`font-medium ${
                projectedSpend > budgetLimit ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {formatCurrency(projectedSpend)}
            </span>
          </div>
          {projectedSpend > budgetLimit && (
            <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span>
                You may exceed your budget by{' '}
                {formatCurrency(projectedSpend - budgetLimit)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
