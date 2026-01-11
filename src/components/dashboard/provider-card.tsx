'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatRelativeTime, calculatePercentChange } from '@/lib/utils'
import { ConnectionWithUsage, ProviderId } from '@/types/providers'
import {
  Sparkles,
  Brain,
  Triangle,
  CreditCard,
  Database,
  Cloud,
  Server,
  Mail,
  Phone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'

const providerIcons: Record<ProviderId, React.ReactNode> = {
  openai: <Sparkles className="h-5 w-5" />,
  anthropic: <Brain className="h-5 w-5" />,
  vercel: <Triangle className="h-5 w-5" />,
  stripe: <CreditCard className="h-5 w-5" />,
  supabase: <Database className="h-5 w-5" />,
  'google-cloud': <Cloud className="h-5 w-5" />,
  aws: <Server className="h-5 w-5" />,
  planetscale: <Database className="h-5 w-5" />,
  resend: <Mail className="h-5 w-5" />,
  twilio: <Phone className="h-5 w-5" />,
}

const providerColors: Record<ProviderId, string> = {
  openai: 'from-emerald-500/20 to-emerald-500/5',
  anthropic: 'from-amber-500/20 to-amber-500/5',
  vercel: 'from-white/20 to-white/5',
  stripe: 'from-indigo-500/20 to-indigo-500/5',
  supabase: 'from-green-500/20 to-green-500/5',
  'google-cloud': 'from-blue-500/20 to-blue-500/5',
  aws: 'from-orange-500/20 to-orange-500/5',
  planetscale: 'from-gray-500/20 to-gray-500/5',
  resend: 'from-gray-500/20 to-gray-500/5',
  twilio: 'from-red-500/20 to-red-500/5',
}

const providerNames: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  vercel: 'Vercel',
  stripe: 'Stripe',
  supabase: 'Supabase',
  'google-cloud': 'Google Cloud',
  aws: 'AWS',
  planetscale: 'PlanetScale',
  resend: 'Resend',
  twilio: 'Twilio',
}

const providerDashboardUrls: Record<ProviderId, string> = {
  openai: 'https://platform.openai.com/usage',
  anthropic: 'https://console.anthropic.com/settings/usage',
  vercel: 'https://vercel.com/dashboard/usage',
  stripe: 'https://dashboard.stripe.com/dashboard',
  supabase: 'https://supabase.com/dashboard',
  'google-cloud': 'https://console.cloud.google.com/billing',
  aws: 'https://console.aws.amazon.com/cost-management',
  planetscale: 'https://app.planetscale.com',
  resend: 'https://resend.com/overview',
  twilio: 'https://console.twilio.com/usage',
}

interface ProviderCardProps {
  connection: ConnectionWithUsage
  totalSpend: number
  onSync?: (connectionId: string) => void
  isSyncing?: boolean
}

export function ProviderCard({
  connection,
  totalSpend,
  onSync,
  isSyncing,
}: ProviderCardProps) {
  const percentOfTotal =
    totalSpend > 0
      ? Math.round((connection.currentMonthSpend / totalSpend) * 100)
      : 0

  const trend = connection.percentChange

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${providerColors[connection.provider]}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-background/50 p-2">
            {providerIcons[connection.provider]}
          </div>
          <CardTitle className="text-base font-medium">
            {providerNames[connection.provider]}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {connection.lastError && (
            <Badge variant="danger" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          )}
          {!connection.isActive && (
            <Badge variant="secondary">Paused</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold">
            {formatCurrency(connection.currentMonthSpend)}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{percentOfTotal}% of total</span>
            {trend !== 0 && (
              <span
                className={`flex items-center gap-0.5 ${
                  trend > 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {connection.lastSyncedAt
              ? `Synced ${formatRelativeTime(connection.lastSyncedAt)}`
              : 'Never synced'}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onSync?.(connection.id)}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              asChild
            >
              <a
                href={providerDashboardUrls[connection.provider]}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
