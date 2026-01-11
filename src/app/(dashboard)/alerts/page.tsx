'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { getActiveProviders } from '@/lib/providers'
import {
  Bell,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Power,
} from 'lucide-react'

interface Alert {
  id: string
  type: 'budget' | 'provider' | 'anomaly'
  provider: string | null
  threshold_cents: number
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

type AlertType = 'budget' | 'provider' | 'anomaly'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [alertType, setAlertType] = useState<AlertType>('budget')
  const [provider, setProvider] = useState<string>('')
  const [threshold, setThreshold] = useState<string>('')

  const providers = getActiveProviders()

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    setAlerts(data || [])
    setIsLoading(false)
  }

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: alertType,
          provider: alertType === 'provider' ? provider : null,
          threshold_cents: Math.round(parseFloat(threshold) * 100),
        }),
      })

      if (response.ok) {
        await fetchAlerts()
        setShowForm(false)
        setAlertType('budget')
        setProvider('')
        setThreshold('')
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleAlert = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      await fetchAlerts()
    } catch (error) {
      console.error('Failed to toggle alert:', error)
    }
  }

  const handleDeleteAlert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      await fetchAlerts()
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'budget':
        return <DollarSign className="h-4 w-4" />
      case 'provider':
        return <Bell className="h-4 w-4" />
      case 'anomaly':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getAlertDescription = (alert: Alert) => {
    switch (alert.type) {
      case 'budget':
        return `Alert when total spend exceeds ${formatCurrency(alert.threshold_cents)}`
      case 'provider':
        return `Alert when ${alert.provider} spend exceeds ${formatCurrency(alert.threshold_cents)}`
      case 'anomaly':
        return `Alert when daily spend is ${alert.threshold_cents / 100}x the average`
      default:
        return ''
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Alerts" subtitle="Get notified when you're approaching budget limits" />

      <div className="flex-1 space-y-6 p-6">
        {/* Active Alerts */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Alerts</h2>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Alert
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-lg p-2 ${
                          alert.is_active ? 'bg-primary/20' : 'bg-muted'
                        }`}
                      >
                        {getAlertIcon(alert.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{alert.type} Alert</span>
                          <Badge variant={alert.is_active ? 'success' : 'secondary'}>
                            {alert.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getAlertDescription(alert)}
                        </p>
                        {alert.last_triggered_at && (
                          <p className="text-xs text-muted-foreground">
                            Last triggered:{' '}
                            {new Date(alert.last_triggered_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                      >
                        <Power className={`h-4 w-4 ${alert.is_active ? 'text-green-500' : ''}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No alerts configured</p>
                <p className="text-sm text-muted-foreground">
                  Create an alert to get notified when you're approaching budget limits
                </p>
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Alert Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Alert</CardTitle>
              <CardDescription>
                Configure when you want to be notified about your spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div className="space-y-2">
                  <Label>Alert Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={alertType === 'budget' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setAlertType('budget')}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Total Budget
                    </Button>
                    <Button
                      type="button"
                      variant={alertType === 'provider' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setAlertType('provider')}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Per Provider
                    </Button>
                    <Button
                      type="button"
                      variant={alertType === 'anomaly' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setAlertType('anomaly')}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Anomaly
                    </Button>
                  </div>
                </div>

                {alertType === 'provider' && (
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <select
                      id="provider"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select a provider</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="threshold">
                    {alertType === 'anomaly' ? 'Multiplier (e.g., 2 for 2x average)' : 'Threshold Amount ($)'}
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    step={alertType === 'anomaly' ? '0.1' : '0.01'}
                    min="0"
                    placeholder={alertType === 'anomaly' ? '2' : '100.00'}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {alertType === 'budget' && 'Alert when total monthly spend exceeds this amount'}
                    {alertType === 'provider' && 'Alert when this provider\'s monthly spend exceeds this amount'}
                    {alertType === 'anomaly' && 'Alert when daily spend is this many times the average'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Alert
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
