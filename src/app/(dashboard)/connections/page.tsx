'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getActiveProviders, getProvider } from '@/lib/providers'
import { ProviderId } from '@/types/providers'
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Brain,
  Triangle,
  CreditCard,
  Database,
} from 'lucide-react'

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Sparkles className="h-5 w-5" />,
  anthropic: <Brain className="h-5 w-5" />,
  vercel: <Triangle className="h-5 w-5" />,
  stripe: <CreditCard className="h-5 w-5" />,
  supabase: <Database className="h-5 w-5" />,
}

interface Connection {
  id: string
  provider: string
  is_active: boolean
  last_synced_at: string | null
  last_error: string | null
  created_at: string
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const providers = getActiveProviders()

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('connections')
      .select('id, provider, is_active, last_synced_at, last_error, created_at')
      .order('created_at', { ascending: false })

    setConnections(data || [])
    setIsLoading(false)
  }

  const handleTestConnection = async () => {
    if (!selectedProvider) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, credentials }),
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: 'Failed to test connection' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleAddConnection = async () => {
    if (!selectedProvider || !testResult?.success) return

    setIsAdding(true)

    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, credentials }),
      })

      if (response.ok) {
        await fetchConnections()
        setSelectedProvider(null)
        setCredentials({})
        setTestResult(null)
      }
    } catch (error) {
      console.error('Failed to add connection:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return

    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE' })
      await fetchConnections()
    } catch (error) {
      console.error('Failed to delete connection:', error)
    }
  }

  const handleSyncConnection = async (id: string) => {
    setSyncingId(id)

    try {
      await fetch(`/api/connections/${id}/sync`, { method: 'POST' })
      await fetchConnections()
    } catch (error) {
      console.error('Failed to sync connection:', error)
    } finally {
      setSyncingId(null)
    }
  }

  const connectedProviderIds = connections.map((c) => c.provider)
  const availableProviders = providers.filter(
    (p) => !connectedProviderIds.includes(p.id)
  )

  return (
    <div className="flex flex-col">
      <Header
        title="Connections"
        subtitle="Manage your API provider connections"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Existing Connections */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Connected Providers</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : connections.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => {
                const provider = getProvider(connection.provider as ProviderId)
                return (
                  <Card key={connection.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-muted p-2">
                          {providerIcons[connection.provider] || (
                            <Database className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {provider?.name || connection.provider}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {connection.last_synced_at
                              ? `Last synced: ${new Date(
                                  connection.last_synced_at
                                ).toLocaleDateString()}`
                              : 'Never synced'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={connection.is_active ? 'success' : 'secondary'}
                      >
                        {connection.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {connection.last_error && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertDescription className="text-xs">
                            {connection.last_error}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncConnection(connection.id)}
                          disabled={syncingId === connection.id}
                        >
                          <RefreshCw
                            className={`mr-1 h-3 w-3 ${
                              syncingId === connection.id ? 'animate-spin' : ''
                            }`}
                          />
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteConnection(connection.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">
                  No providers connected yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Add your first provider below to start tracking costs
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add New Connection */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Add Provider</h2>

          {selectedProvider ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2">
                    {providerIcons[selectedProvider]}
                  </div>
                  <div>
                    <CardTitle>
                      {getProvider(selectedProvider)?.name}
                    </CardTitle>
                    <CardDescription>
                      {getProvider(selectedProvider)?.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {getProvider(selectedProvider)?.credentialFields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && (
                        <span className="text-destructive"> *</span>
                      )}
                    </Label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.name}
                        placeholder={field.placeholder}
                        value={credentials[field.name] || ''}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            [field.name]: e.target.value,
                          })
                        }
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={credentials[field.name] || ''}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            [field.name]: e.target.value,
                          })
                        }
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground">
                        {field.helpText}
                      </p>
                    )}
                  </div>
                ))}

                {testResult && (
                  <Alert variant={testResult.success ? 'success' : 'destructive'}>
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {testResult.success
                          ? 'Connection successful!'
                          : testResult.error}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(null)
                      setCredentials({})
                      setTestResult(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    onClick={handleAddConnection}
                    disabled={!testResult?.success || isAdding}
                  >
                    {isAdding && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-muted p-2">
                        {providerIcons[provider.id]}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {provider.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {provider.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {availableProviders.length === 0 && (
                <Card className="border-dashed md:col-span-2 lg:col-span-3">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
                    <p className="font-medium">All providers connected!</p>
                    <p className="text-sm text-muted-foreground">
                      You've connected all available providers
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
