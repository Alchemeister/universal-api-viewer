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
import { User, CreditCard, Bell, Download, Loader2, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Settings state
  const [monthlyBudget, setMonthlyBudget] = useState<string>('500')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackWebhook, setSlackWebhook] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUser(user)

      // Fetch subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSubscription(sub)
    }

    setIsLoading(false)
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    // In a real app, save to database
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleExportData = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('usage_records')
      .select('*')
      .order('date', { ascending: false })

    if (data) {
      // Convert to CSV
      const headers = ['Date', 'Provider', 'Amount (cents)', 'Currency']
      const rows = data.map((r) => [r.date, r.provider, r.amount_cents, r.currency])
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devcosts-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" subtitle="Manage your account and preferences" />

      <div className="flex-1 space-y-6 p-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Member Since</Label>
                <p className="font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Subscription</CardTitle>
              </div>
              <Badge
                variant={subscription?.tier === 'free' ? 'secondary' : 'default'}
              >
                {subscription?.tier?.toUpperCase() || 'FREE'}
              </Badge>
            </div>
            <CardDescription>Manage your subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {subscription?.tier === 'free'
                      ? 'Free Plan'
                      : subscription?.tier === 'pro'
                      ? 'Pro Plan'
                      : 'Team Plan'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.tier === 'free'
                      ? '3 providers, 30-day history'
                      : subscription?.tier === 'pro'
                      ? 'Unlimited providers, 1-year history'
                      : 'Team collaboration features'}
                  </p>
                </div>
                {subscription?.tier === 'free' && (
                  <Button>Upgrade to Pro</Button>
                )}
              </div>
            </div>

            {subscription?.tier !== 'free' && subscription?.current_period_end && (
              <p className="text-sm text-muted-foreground">
                Your subscription renews on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Budget & Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Budget & Notifications</CardTitle>
            </div>
            <CardDescription>Configure your monthly budget and notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used for budget progress tracking on dashboard
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email Notifications</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="emailNotifications" className="text-sm">
                    Receive email alerts
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slack">Slack Webhook URL (optional)</Label>
              <Input
                id="slack"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord">Discord Webhook URL (optional)</Label>
              <Input
                id="discord"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
              />
            </div>

            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saved && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Export Data</CardTitle>
            </div>
            <CardDescription>Download your usage data as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
