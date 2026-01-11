import { Provider, UsageData } from '@/types/providers'

// Anthropic model pricing per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-3.5-haiku': { input: 0.8, output: 4 },
  'claude-2.1': { input: 8, output: 24 },
  'claude-2.0': { input: 8, output: 24 },
  'claude-instant-1.2': { input: 0.8, output: 2.4 },
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Match model name to pricing (e.g., claude-3-5-sonnet-20241022 -> claude-3.5-sonnet)
  let pricingKey = 'claude-3.5-sonnet' // default
  for (const key of Object.keys(MODEL_PRICING)) {
    if (model.toLowerCase().includes(key.replace('.', '-').replace('.', ''))) {
      pricingKey = key
      break
    }
  }

  const pricing = MODEL_PRICING[pricingKey]
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 100) // return cents
}

export const anthropicProvider: Provider = {
  id: 'anthropic',
  name: 'Anthropic',
  description: 'Claude models for AI assistance',
  icon: 'Brain',
  color: '#D4A574',
  credentialFields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: 'sk-ant-...',
      helpText: 'Get your API key from console.anthropic.com',
      required: true,
    },
  ],

  async testConnection(credentials) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': credentials.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 401) {
          return { success: false, error: 'Invalid API key' }
        }
        return { success: false, error: error.error?.message || 'Connection failed' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to connect to Anthropic' }
    }
  },

  async fetchUsage(credentials, startDate, endDate) {
    try {
      // Anthropic usage API endpoint
      const response = await fetch('https://api.anthropic.com/v1/usage', {
        method: 'GET',
        headers: {
          'x-api-key': credentials.apiKey,
          'anthropic-version': '2023-06-01',
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch Anthropic usage:', response.status)
        return []
      }

      const data = await response.json()
      const usageData: UsageData[] = []

      // Process usage data - group by date
      if (data.usage && Array.isArray(data.usage)) {
        const dailyUsage: Record<string, number> = {}

        for (const item of data.usage) {
          const date = item.date || new Date().toISOString().split('T')[0]
          const model = item.model || 'claude-3.5-sonnet'
          const inputTokens = item.input_tokens || 0
          const outputTokens = item.output_tokens || 0
          const cost = calculateCost(model, inputTokens, outputTokens)

          if (!dailyUsage[date]) {
            dailyUsage[date] = 0
          }
          dailyUsage[date] += cost
        }

        for (const [date, amountCents] of Object.entries(dailyUsage)) {
          const dateObj = new Date(date)
          if (dateObj >= startDate && dateObj <= endDate) {
            usageData.push({
              date,
              amountCents,
              currency: 'USD',
            })
          }
        }
      }

      return usageData
    } catch (error) {
      console.error('Failed to fetch Anthropic usage:', error)
      return []
    }
  },
}
