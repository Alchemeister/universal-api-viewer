import { Provider, UsageData } from '@/types/providers'

export const vercelProvider: Provider = {
  id: 'vercel',
  name: 'Vercel',
  description: 'Vercel hosting and serverless functions',
  icon: 'Triangle',
  color: '#000000',
  credentialFields: [
    {
      name: 'apiToken',
      label: 'API Token',
      type: 'password',
      placeholder: 'Your Vercel API token',
      helpText: 'Get your token from vercel.com/account/tokens',
      required: true,
    },
    {
      name: 'teamId',
      label: 'Team ID (optional)',
      type: 'text',
      placeholder: 'team_...',
      helpText: 'Required for team accounts',
      required: false,
    },
  ],

  async testConnection(credentials) {
    try {
      const url = new URL('https://api.vercel.com/v2/user')
      if (credentials.teamId) {
        url.searchParams.set('teamId', credentials.teamId)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Invalid API token' }
        }
        return { success: false, error: 'Connection failed' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to connect to Vercel' }
    }
  },

  async fetchUsage(credentials, startDate, endDate) {
    try {
      const url = new URL('https://api.vercel.com/v1/usage')
      if (credentials.teamId) {
        url.searchParams.set('teamId', credentials.teamId)
      }

      // Vercel uses Unix timestamps in milliseconds
      url.searchParams.set('from', startDate.getTime().toString())
      url.searchParams.set('to', endDate.getTime().toString())

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch Vercel usage:', response.status)
        return []
      }

      const data = await response.json()
      const usageData: UsageData[] = []

      // Process Vercel usage data
      // Vercel pricing (approximate):
      // - Bandwidth: $0.15/GB after free tier
      // - Function invocations: $0.60/1M after free tier
      // - Function duration: $0.18/GB-hour
      if (data.usage) {
        const dailyUsage: Record<string, number> = {}

        // Bandwidth costs
        if (data.usage.bandwidth) {
          const gbUsed = data.usage.bandwidth / (1024 * 1024 * 1024)
          const bandwidthCost = Math.max(0, gbUsed - 100) * 15 // 15 cents per GB after 100GB free

          const dateStr = new Date().toISOString().split('T')[0]
          dailyUsage[dateStr] = (dailyUsage[dateStr] || 0) + Math.round(bandwidthCost)
        }

        // Function invocation costs
        if (data.usage.serverlessFunctionInvocations) {
          const invocations = data.usage.serverlessFunctionInvocations
          const invocationCost = Math.max(0, invocations - 100000) * 0.00006 * 100 // $0.60/1M

          const dateStr = new Date().toISOString().split('T')[0]
          dailyUsage[dateStr] = (dailyUsage[dateStr] || 0) + Math.round(invocationCost)
        }

        for (const [date, amountCents] of Object.entries(dailyUsage)) {
          if (amountCents > 0) {
            usageData.push({
              date,
              amountCents,
              currency: 'USD',
              rawData: data,
            })
          }
        }
      }

      return usageData
    } catch (error) {
      console.error('Failed to fetch Vercel usage:', error)
      return []
    }
  },
}
