# DevCosts - Unified API Billing Dashboard

## Project Overview
Micro-SaaS that aggregates billing/usage data from multiple developer APIs (OpenAI, Anthropic, AWS, Vercel, Stripe, etc.) into a single dashboard. Solves the pain of checking 5-10+ separate billing dashboards.

**Core Value:** See all API costs in one place, get alerts before budget limits, forecast monthly spend, never get surprised by a bill.

## Tech Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes (Vercel serverless)
- **Database:** Supabase (Postgres + Auth + Row Level Security)
- **Payments:** Stripe (Checkout + Webhooks)
- **Emails:** Resend
- **Cron:** Vercel Cron or Trigger.dev
- **Charts:** Recharts or Tremor (pairs well with shadcn)

## Project Structure
```
/src
  /app
    /(marketing)        # Landing page, pricing (public)
      /page.tsx
      /pricing/page.tsx
    /(auth)             # Auth pages
      /login/page.tsx
      /signup/page.tsx
    /(dashboard)        # Protected routes
      /dashboard/page.tsx
      /connections/page.tsx
      /alerts/page.tsx
      /settings/page.tsx
    /api
      /auth/callback/route.ts
      /connections/route.ts
      /connections/[id]/route.ts
      /connections/[id]/sync/route.ts
      /usage/route.ts
      /alerts/route.ts
      /alerts/[id]/route.ts
      /cron/sync-all/route.ts
      /cron/check-alerts/route.ts
      /webhooks/stripe/route.ts
  /components
    /ui                 # shadcn components
    /dashboard          # Dashboard-specific components
      /provider-card.tsx
      /spend-chart.tsx
      /budget-progress.tsx
      /alert-badge.tsx
    /forms
      /connection-form.tsx
    /layout
      /sidebar.tsx
      /header.tsx
  /lib
    /supabase
      /client.ts        # Browser client
      /server.ts        # Server client
      /admin.ts         # Service role client (for cron)
    /providers          # API integration modules
      /index.ts         # Provider registry
      /base.ts          # Base provider interface
      /openai.ts
      /anthropic.ts
      /vercel.ts
      /stripe-provider.ts
      /aws.ts
      /supabase-provider.ts
      /google-cloud.ts
      /planetscale.ts
      /resend-provider.ts
      /twilio.ts
    /encryption.ts      # Credential encryption utilities
    /stripe.ts          # Stripe client + helpers
    /resend.ts          # Email client
    /utils.ts
  /hooks
    /use-usage.ts
    /use-connections.ts
    /use-alerts.ts
  /types
    /database.ts        # Generated from Supabase
    /providers.ts       # Provider types
/supabase
  /migrations           # SQL migrations
  /seed.sql
```

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Generate Supabase types
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

# Run Supabase locally
npx supabase start

# Push migrations
npx supabase db push

# Run tests
npm test

# Build for production
npm run build

# Lint
npm run lint
```

## Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron secret (for securing cron endpoints)
CRON_SECRET=
```

## Database Schema

### Tables
- `connections` - Stores encrypted API credentials per provider
- `usage_records` - Daily usage/cost data per connection
- `alerts` - User-defined budget/anomaly alerts
- `alert_history` - Log of triggered alerts
- `subscriptions` - User subscription tier (synced from Stripe)

### Row Level Security
All tables must have RLS enabled. Users can only access their own data:
```sql
create policy "Users can only see own connections"
  on connections for all
  using (auth.uid() = user_id);
```

### Important Constraints
- `usage_records` has unique constraint on `(connection_id, date)` - use upsert for syncs
- Cascade deletes: deleting a connection removes all its usage_records
- `amount_cents` stored as integer (avoid floating point currency issues)

## Provider Integration Pattern

Each provider module must implement:
```typescript
interface Provider {
  id: string;                          // 'openai', 'anthropic', etc.
  name: string;                        // Display name
  icon: string;                        // Icon path or component
  credentialFields: CredentialField[]; // What to collect from user
  testConnection(credentials: any): Promise<boolean>;
  fetchUsage(credentials: any, startDate: Date, endDate: Date): Promise<UsageData[]>;
}
```

### Provider-Specific Notes

**OpenAI:** No official billing API. Use `/v1/usage?date=YYYY-MM-DD` endpoint. Calculate costs from token counts × model pricing. Must maintain pricing table.

**Anthropic:** Use `/v1/usage` with `x-api-key` header.

**AWS:** Use Cost Explorer SDK. Requires IAM credentials with `ce:GetCostAndUsage` permission. Costs can be delayed 24-48 hours.

**Google Cloud:** Requires service account JSON with `billing.accounts.get` permission. Use Cloud Billing API.

**Vercel:** `/v1/usage` endpoint. Usage is based on bandwidth, builds, functions.

**Stripe:** Use `/v1/balance` and `/v1/invoices`. This is their processing fees, not what you charge customers.

## Security Requirements

### Credential Encryption
- Encrypt all API keys before storing in database
- Use AES-256-GCM with ENCRYPTION_KEY env var
- Decrypt only in memory when making API calls
- Never log credentials (use `[REDACTED]` in logs)

```typescript
// lib/encryption.ts pattern
export function encrypt(plaintext: string): string;
export function decrypt(ciphertext: string): string;
```

### API Route Protection
- All `/api/*` routes (except webhooks) require auth
- Use `createServerClient` from `@supabase/ssr`
- Cron routes verify `CRON_SECRET` header
- Stripe webhooks verify signature

### Rate Limiting
- Implement rate limiting on connection sync endpoints
- Respect provider rate limits (store in provider config)
- Use exponential backoff on failures

## Pricing Tiers

| Feature | Free | Pro ($9/mo) | Team ($29/mo) |
|---------|------|-------------|---------------|
| Providers | 3 | Unlimited | Unlimited |
| History | 30 days | 1 year | 1 year |
| Alerts | Email only | + Slack/Discord | + Slack/Discord |
| CSV Export | No | Yes | Yes |
| Team members | 1 | 1 | 5 |

Enforce in middleware/API routes based on `subscriptions` table.

## UI/UX Guidelines

- **Theme:** Dark mode default, light mode optional
- **Style:** Clean, minimal (Linear/Vercel aesthetic)
- **Colors:**
  - Green: Under budget / healthy
  - Yellow: Warning (>75% of budget)
  - Red: Over budget / alert triggered
- **Provider cards:** Subtle gradients matching provider brand colors
- **Charts:** Use consistent color palette, animate on load

## Key Patterns

### Data Fetching (App Router)
- Use Server Components for initial data
- Client components with SWR/React Query for real-time updates
- Mutations via Server Actions or API routes

### Error Handling
- Wrap provider API calls in try/catch
- Store sync errors in `connections.last_error`
- Show user-friendly error messages
- Retry transient failures with backoff

### Cron Jobs
```typescript
// Secure cron endpoint pattern
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... sync logic
}
```

## Testing Strategy
- Unit tests for encryption, cost calculations, provider parsing
- Integration tests for API routes (use Supabase local)
- E2E tests for critical flows (connect provider, view dashboard)

## MVP Launch Order
1. Auth (Supabase Google OAuth + email)
2. Connection management (add/remove/test)
3. 5 initial providers: OpenAI, Anthropic, Vercel, Stripe, Supabase
4. Dashboard with basic charts
5. Email alerts (budget only)
6. Landing page + pricing
7. Stripe integration (Pro tier)

## Common Gotchas
- Supabase Auth requires callback URL configuration
- Stripe webhooks need raw body (disable body parsing)
- AWS Cost Explorer data is delayed 24-48 hours
- OpenAI usage endpoint requires organization ID for some accounts
- Vercel rate limits are strict - cache responses
- Provider APIs may return costs in different currencies - normalize to USD
- Date handling: always use UTC for storage, convert for display

## Performance Considerations
- Index `usage_records` on `(user_id, date)` for dashboard queries
- Aggregate data in database, not application code
- Cache provider responses (5-minute TTL for manual refresh)
- Use incremental static regeneration for marketing pages

## Future Considerations (Don't build yet)
- Team workspaces (v2)
- Cost allocation tags
- Mobile app
- Browser extension
- Zapier integration
- AI cost optimization suggestions
