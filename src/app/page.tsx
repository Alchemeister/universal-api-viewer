import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CreditCard,
  Bell,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Check,
  ArrowRight,
  Sparkles,
  Brain,
  Triangle,
  Database,
} from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Unified Dashboard',
    description:
      'See all your API costs in one place. No more switching between 10+ billing dashboards.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description:
      'Get notified before you hit budget limits. Set alerts per provider or for total spend.',
  },
  {
    icon: TrendingUp,
    title: 'Cost Forecasting',
    description:
      'Predict your end-of-month spend based on current usage patterns.',
  },
  {
    icon: Shield,
    title: 'Secure by Design',
    description:
      'API keys encrypted at rest. We never log credentials. Your data stays yours.',
  },
  {
    icon: Zap,
    title: 'Auto-Sync',
    description:
      'Usage data synced daily automatically. Manual refresh available anytime.',
  },
  {
    icon: CreditCard,
    title: 'Multi-Currency',
    description:
      'All costs normalized to USD for easy comparison across providers.',
  },
]

const providers = [
  { name: 'OpenAI', icon: Sparkles, color: 'text-emerald-400' },
  { name: 'Anthropic', icon: Brain, color: 'text-amber-400' },
  { name: 'Vercel', icon: Triangle, color: 'text-white' },
  { name: 'Supabase', icon: Database, color: 'text-green-400' },
  { name: 'Stripe', icon: CreditCard, color: 'text-indigo-400' },
]

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For indie hackers getting started',
    features: [
      '3 connected providers',
      '30-day usage history',
      'Email alerts only',
      'Daily auto-sync',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For serious developers',
    features: [
      'Unlimited providers',
      '1-year usage history',
      'Slack & Discord alerts',
      'CSV export',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$29',
    period: '/month',
    description: 'For growing teams',
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      'Shared dashboards',
      'Team spending reports',
      'SSO coming soon',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DevCosts</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm">
            <Zap className="mr-2 h-3 w-3" />
            Track all your API costs in one place
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Never get surprised by an{' '}
            <span className="text-primary">API bill</span> again
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            DevCosts aggregates billing data from OpenAI, Anthropic, Vercel,
            and more into a single dashboard. Set budget alerts and forecast
            your monthly spend.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button size="lg" variant="outline">View Pricing</Button>
            </Link>
          </div>

          {/* Provider Logos */}
          <div className="mt-12 flex items-center justify-center gap-8">
            <span className="text-sm text-muted-foreground">Works with:</span>
            {providers.map((provider) => (
              <div key={provider.name} className="flex items-center gap-1">
                <provider.icon className={`h-5 w-5 ${provider.color}`} />
                <span className="text-sm">{provider.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Everything you need to control API costs
            </h2>
            <p className="text-lg text-muted-foreground">
              Stop wasting time checking 10 different billing dashboards.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-t px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? 'border-primary shadow-lg' : ''}
              >
                <CardHeader>
                  {plan.popular && (
                    <div className="mb-2 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block pt-2">
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to take control of your API costs?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join developers who save hours every month by tracking all their API
            costs in one place.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-semibold">DevCosts</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <a
              href="https://twitter.com/devcosts"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
