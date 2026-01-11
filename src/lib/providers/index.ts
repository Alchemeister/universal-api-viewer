import { Provider, ProviderId } from '@/types/providers'
import { openaiProvider } from './openai'
import { anthropicProvider } from './anthropic'
import { vercelProvider } from './vercel'
import { stripeProvider } from './stripe-provider'
import { supabaseProvider } from './supabase-provider'

export const providers: Record<ProviderId, Provider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  vercel: vercelProvider,
  stripe: stripeProvider,
  supabase: supabaseProvider,
  // Placeholder providers - to be implemented
  'google-cloud': {
    id: 'google-cloud',
    name: 'Google Cloud',
    description: 'Google Cloud Platform billing',
    icon: 'Cloud',
    color: '#4285F4',
    credentialFields: [
      { name: 'serviceAccount', label: 'Service Account JSON', type: 'textarea', required: true },
      { name: 'billingAccountId', label: 'Billing Account ID', type: 'text', required: true },
    ],
    testConnection: async () => ({ success: false, error: 'Not implemented yet' }),
    fetchUsage: async () => [],
  },
  aws: {
    id: 'aws',
    name: 'AWS',
    description: 'Amazon Web Services Cost Explorer',
    icon: 'Server',
    color: '#FF9900',
    credentialFields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { name: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1', required: true },
    ],
    testConnection: async () => ({ success: false, error: 'Not implemented yet' }),
    fetchUsage: async () => [],
  },
  planetscale: {
    id: 'planetscale',
    name: 'PlanetScale',
    description: 'PlanetScale database usage',
    icon: 'Database',
    color: '#000000',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'organizationId', label: 'Organization ID', type: 'text', required: true },
    ],
    testConnection: async () => ({ success: false, error: 'Not implemented yet' }),
    fetchUsage: async () => [],
  },
  resend: {
    id: 'resend',
    name: 'Resend',
    description: 'Resend email API usage',
    icon: 'Mail',
    color: '#000000',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    testConnection: async () => ({ success: false, error: 'Not implemented yet' }),
    fetchUsage: async () => [],
  },
  twilio: {
    id: 'twilio',
    name: 'Twilio',
    description: 'Twilio communications usage',
    icon: 'Phone',
    color: '#F22F46',
    credentialFields: [
      { name: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { name: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
    testConnection: async () => ({ success: false, error: 'Not implemented yet' }),
    fetchUsage: async () => [],
  },
}

export function getProvider(id: ProviderId): Provider {
  return providers[id]
}

export function getAllProviders(): Provider[] {
  return Object.values(providers)
}

export function getActiveProviders(): Provider[] {
  // Return only fully implemented providers
  return [openaiProvider, anthropicProvider, vercelProvider, stripeProvider, supabaseProvider]
}
