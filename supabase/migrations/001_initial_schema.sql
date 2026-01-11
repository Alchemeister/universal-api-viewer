-- DevCosts Initial Schema
-- Run this migration in your Supabase SQL editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Connections table (stores encrypted API credentials)
create table if not exists public.connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  credentials text not null, -- encrypted JSON
  is_active boolean default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz default now() not null
);

-- Usage records table
create table if not exists public.usage_records (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid references public.connections(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  date date not null,
  amount_cents integer not null,
  currency text default 'USD',
  raw_data jsonb,
  created_at timestamptz default now() not null,
  unique(connection_id, date)
);

-- Alerts table
create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('budget', 'provider', 'anomaly')),
  provider text, -- null for total budget alerts
  threshold_cents integer not null,
  is_active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now() not null
);

-- Alert history table
create table if not exists public.alert_history (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid references public.alerts(id) on delete cascade not null,
  triggered_at timestamptz default now() not null,
  amount_cents integer not null,
  message text
);

-- Subscriptions table (synced from Stripe)
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text default 'free' check (tier in ('free', 'pro', 'team')),
  status text default 'active' check (status in ('active', 'canceled', 'past_due')),
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance
create index if not exists idx_connections_user_id on public.connections(user_id);
create index if not exists idx_usage_records_user_id_date on public.usage_records(user_id, date);
create index if not exists idx_usage_records_connection_id on public.usage_records(connection_id);
create index if not exists idx_alerts_user_id on public.alerts(user_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);

-- Row Level Security
alter table public.connections enable row level security;
alter table public.usage_records enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_history enable row level security;
alter table public.subscriptions enable row level security;

-- RLS Policies for connections
create policy "Users can view own connections"
  on public.connections for select
  using (auth.uid() = user_id);

create policy "Users can create own connections"
  on public.connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own connections"
  on public.connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own connections"
  on public.connections for delete
  using (auth.uid() = user_id);

-- RLS Policies for usage_records
create policy "Users can view own usage records"
  on public.usage_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage records"
  on public.usage_records for insert
  with check (auth.uid() = user_id);

-- RLS Policies for alerts
create policy "Users can view own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can create own alerts"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

create policy "Users can delete own alerts"
  on public.alerts for delete
  using (auth.uid() = user_id);

-- RLS Policies for alert_history
create policy "Users can view own alert history"
  on public.alert_history for select
  using (
    exists (
      select 1 from public.alerts
      where alerts.id = alert_history.alert_id
      and alerts.user_id = auth.uid()
    )
  );

-- RLS Policies for subscriptions
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Function to automatically create subscription on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create subscription on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on subscriptions
create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.update_updated_at_column();
