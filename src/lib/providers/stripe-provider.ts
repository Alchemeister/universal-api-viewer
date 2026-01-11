import { Provider, UsageData } from '@/types/providers'

export const stripeProvider: Provider = {
  id: 'stripe',
  name: 'Stripe',
  description: 'Stripe payment processing fees',
  icon: 'CreditCard',
  color: '#635BFF',
  credentialFields: [
    {
      name: 'secretKey',
      label: 'Secret Key',
      type: 'password',
      placeholder: 'sk_live_... or sk_test_...',
      helpText: 'Get your key from dashboard.stripe.com/apikeys',
      required: true,
    },
  ],

  async testConnection(credentials) {
    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          Authorization: `Bearer ${credentials.secretKey}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid API key' }
        }
        return { success: false, error: 'Connection failed' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to connect to Stripe' }
    }
  },

  async fetchUsage(credentials, startDate, endDate) {
    try {
      // Fetch balance transactions to calculate fees
      const url = new URL('https://api.stripe.com/v1/balance_transactions')
      url.searchParams.set('created[gte]', Math.floor(startDate.getTime() / 1000).toString())
      url.searchParams.set('created[lte]', Math.floor(endDate.getTime() / 1000).toString())
      url.searchParams.set('limit', '100')

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${credentials.secretKey}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch Stripe transactions:', response.status)
        return []
      }

      const data = await response.json()
      const usageData: UsageData[] = []

      // Group fees by date
      const dailyFees: Record<string, number> = {}

      if (data.data && Array.isArray(data.data)) {
        for (const transaction of data.data) {
          // Fee is negative in Stripe, we want positive
          const fee = Math.abs(transaction.fee || 0)
          if (fee > 0) {
            const date = new Date(transaction.created * 1000).toISOString().split('T')[0]
            dailyFees[date] = (dailyFees[date] || 0) + fee
          }
        }
      }

      for (const [date, amountCents] of Object.entries(dailyFees)) {
        usageData.push({
          date,
          amountCents,
          currency: 'USD',
        })
      }

      // Also fetch invoices for subscription billing
      const invoicesUrl = new URL('https://api.stripe.com/v1/invoices')
      invoicesUrl.searchParams.set('created[gte]', Math.floor(startDate.getTime() / 1000).toString())
      invoicesUrl.searchParams.set('created[lte]', Math.floor(endDate.getTime() / 1000).toString())
      invoicesUrl.searchParams.set('status', 'paid')
      invoicesUrl.searchParams.set('limit', '100')

      const invoicesResponse = await fetch(invoicesUrl.toString(), {
        headers: {
          Authorization: `Bearer ${credentials.secretKey}`,
        },
      })

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        // Note: This is Stripe's billing to YOU (your Stripe subscription fees)
        // Most users won't have this, but it's useful for Stripe Atlas users
      }

      return usageData
    } catch (error) {
      console.error('Failed to fetch Stripe usage:', error)
      return []
    }
  },
}
