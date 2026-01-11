import { Provider, UsageData } from '@/types/providers'

export const supabaseProvider: Provider = {
  id: 'supabase',
  name: 'Supabase',
  description: 'Supabase database and auth usage',
  icon: 'Database',
  color: '#3ECF8E',
  credentialFields: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'password',
      placeholder: 'sbp_...',
      helpText: 'Get your token from supabase.com/dashboard/account/tokens',
      required: true,
    },
    {
      name: 'projectRef',
      label: 'Project Reference',
      type: 'text',
      placeholder: 'your-project-ref',
      helpText: 'Found in your project URL: supabase.com/dashboard/project/[ref]',
      required: true,
    },
  ],

  async testConnection(credentials) {
    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${credentials.projectRef}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid access token' }
        }
        if (response.status === 404) {
          return { success: false, error: 'Project not found' }
        }
        return { success: false, error: 'Connection failed' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to connect to Supabase' }
    }
  },

  async fetchUsage(credentials, startDate, endDate) {
    try {
      // Fetch project usage
      const url = new URL(
        `https://api.supabase.com/v1/projects/${credentials.projectRef}/usage`
      )

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch Supabase usage:', response.status)
        return []
      }

      const data = await response.json()
      const usageData: UsageData[] = []

      // Supabase pricing (Pay as you go):
      // - Database: $0.125/hour for 2 vCPU
      // - Storage: $0.021/GB/month
      // - Egress: $0.09/GB
      // - Auth MAU: $0.00325/MAU after 50k
      // - Edge Functions: $2/million invocations

      if (data) {
        // Calculate daily costs based on usage metrics
        const dateStr = new Date().toISOString().split('T')[0]
        let totalCents = 0

        // Database compute (if available)
        if (data.db_size) {
          // Approximate storage cost
          const gbSize = data.db_size / (1024 * 1024 * 1024)
          const storageCost = gbSize * 2.1 // $0.021/GB * 100 for cents
          totalCents += Math.round(storageCost)
        }

        // Egress
        if (data.db_egress) {
          const gbEgress = data.db_egress / (1024 * 1024 * 1024)
          const egressCost = gbEgress * 9 // $0.09/GB * 100 for cents
          totalCents += Math.round(egressCost)
        }

        // Auth users
        if (data.total_auth_users && data.total_auth_users > 50000) {
          const billableUsers = data.total_auth_users - 50000
          const authCost = billableUsers * 0.325 // $0.00325 * 100 for cents
          totalCents += Math.round(authCost)
        }

        // Edge function invocations
        if (data.total_func_invocations && data.total_func_invocations > 500000) {
          const billableInvocations = data.total_func_invocations - 500000
          const funcCost = (billableInvocations / 1000000) * 200 // $2/million * 100
          totalCents += Math.round(funcCost)
        }

        if (totalCents > 0) {
          usageData.push({
            date: dateStr,
            amountCents: totalCents,
            currency: 'USD',
            rawData: data,
          })
        }
      }

      return usageData
    } catch (error) {
      console.error('Failed to fetch Supabase usage:', error)
      return []
    }
  },
}
