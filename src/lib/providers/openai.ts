import { Provider, UsageData } from '@/types/providers'

// OpenAI model pricing per 1M tokens (as of 2024)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-32k': { input: 60, output: 120 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'whisper-1': { input: 0.006, output: 0 }, // per second
  'tts-1': { input: 15, output: 0 }, // per 1M chars
  'tts-1-hd': { input: 30, output: 0 },
  'dall-e-3': { input: 40, output: 0 }, // per image (standard)
  'dall-e-2': { input: 20, output: 0 },
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'] // default fallback
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 100) // return cents
}

export const openaiProvider: Provider = {
  id: 'openai',
  name: 'OpenAI',
  description: 'GPT-4, DALL-E, Whisper, and more',
  icon: 'Sparkles',
  color: '#10A37F',
  credentialFields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: 'sk-...',
      helpText: 'Get your API key from platform.openai.com',
      required: true,
    },
    {
      name: 'organizationId',
      label: 'Organization ID (optional)',
      type: 'text',
      placeholder: 'org-...',
      helpText: 'Required if you belong to multiple organizations',
      required: false,
    },
  ],

  async testConnection(credentials) {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      }

      if (credentials.organizationId) {
        headers['OpenAI-Organization'] = credentials.organizationId
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error?.message || 'Invalid API key' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to connect to OpenAI' }
    }
  },

  async fetchUsage(credentials, startDate, endDate) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    }

    if (credentials.organizationId) {
      headers['OpenAI-Organization'] = credentials.organizationId
    }

    const usageData: UsageData[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]

      try {
        const response = await fetch(
          `https://api.openai.com/v1/usage?date=${dateStr}`,
          { headers }
        )

        if (response.ok) {
          const data = await response.json()
          let totalCents = 0

          // Process usage data
          if (data.data && Array.isArray(data.data)) {
            for (const item of data.data) {
              const model = item.snapshot_id || 'gpt-4o'
              const inputTokens = item.n_context_tokens_total || 0
              const outputTokens = item.n_generated_tokens_total || 0
              totalCents += calculateCost(model, inputTokens, outputTokens)
            }
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
      } catch (error) {
        console.error(`Failed to fetch OpenAI usage for ${dateStr}:`, error)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return usageData
  },
}
