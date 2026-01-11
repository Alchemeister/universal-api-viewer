import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

function getWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return process.env.STRIPE_WEBHOOK_SECRET
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  const stripe = getStripeClient()
  const webhookSecret = getWebhookSecret()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode === 'subscription' && session.customer && session.subscription) {
        // Get subscription details
        const subscriptionResponse = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        // Handle both old and new SDK versions
        const subscription = 'data' in subscriptionResponse
          ? (subscriptionResponse as any).data
          : subscriptionResponse

        // Determine tier from price
        const priceId = subscription.items?.data?.[0]?.price?.id
        let tier = 'free'
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) tier = 'pro'
        if (priceId === process.env.STRIPE_TEAM_PRICE_ID) tier = 'team'

        // Get period end timestamp
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null

        // Update subscription in database
        await supabase
          .from('subscriptions')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            tier,
            status: 'active',
            current_period_end: periodEnd,
          })
          .eq('user_id', session.client_reference_id)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription

      // Determine tier
      const priceId = subscription.items?.data?.[0]?.price?.id
      let tier = 'free'
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) tier = 'pro'
      if (priceId === process.env.STRIPE_TEAM_PRICE_ID) tier = 'team'

      // Get period end - handle potential undefined
      const periodEnd = (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null

      // Update subscription
      await supabase
        .from('subscriptions')
        .update({
          tier,
          status: subscription.status === 'active' ? 'active' : 'past_due',
          current_period_end: periodEnd,
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      // Downgrade to free
      await supabase
        .from('subscriptions')
        .update({
          tier: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          current_period_end: null,
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = (invoice as any).subscription

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId as string)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
