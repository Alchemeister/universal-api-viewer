export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google-cloud'
  | 'vercel'
  | 'stripe'
  | 'aws'
  | 'supabase'
  | 'planetscale'
  | 'resend'
  | 'twilio'

export interface CredentialField {
  name: string
  label: string
  type: 'text' | 'password' | 'textarea'
  placeholder?: string
  helpText?: string
  required: boolean
}

export interface UsageData {
  date: string // YYYY-MM-DD
  amountCents: number
  currency: string
  rawData?: Record<string, unknown>
}

export interface Provider {
  id: ProviderId
  name: string
  description: string
  icon: string // Lucide icon name
  color: string // Brand color for UI
  credentialFields: CredentialField[]
  testConnection(credentials: Record<string, string>): Promise<{ success: boolean; error?: string }>
  fetchUsage(
    credentials: Record<string, string>,
    startDate: Date,
    endDate: Date
  ): Promise<UsageData[]>
}

export interface ConnectionWithUsage {
  id: string
  provider: ProviderId
  isActive: boolean
  lastSyncedAt: string | null
  lastError: string | null
  currentMonthSpend: number
  previousMonthSpend: number
  percentChange: number
}

export interface DailySpend {
  date: string
  total: number
  byProvider: Record<ProviderId, number>
}

export interface DashboardData {
  totalSpendThisMonth: number
  totalSpendLastMonth: number
  projectedMonthEnd: number
  dailySpend: DailySpend[]
  connectionStats: ConnectionWithUsage[]
}
