-- Public Data Agents — initial schema
-- Applies to the "public" schema. auth.users is managed by Supabase Auth;
-- everything here references it by id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, created automatically on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing profile data, 1:1 with auth.users.';

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- agents: static-ish catalogue of the available data agents
-- ---------------------------------------------------------------------------
create table if not exists public.agents (
  id text primary key, -- e.g. 'new-incorporations'
  name text not null,
  tagline text not null,
  description text not null,
  data_source text not null,
  delivery_mode text not null default 'subscription' check (delivery_mode in ('subscription', 'on_demand')),
  monthly_price_gbp numeric(10, 2),
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.agents is 'Catalogue of data agents users can subscribe to. Seeded via seed.sql, editable by admins only.';

-- ---------------------------------------------------------------------------
-- subscriptions: which users are subscribed to which agents
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_id text not null references public.agents (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  -- Free-form per-agent filter payload, e.g. { "postcode": "M1", "sic_codes": ["62012"] }
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, agent_id)
);

comment on table public.subscriptions is 'A user''s subscription to one agent, including their filter configuration.';

create index if not exists subscriptions_agent_id_status_idx
  on public.subscriptions (agent_id, status);

-- ---------------------------------------------------------------------------
-- delivery_channels: where a user's alerts get sent
-- ---------------------------------------------------------------------------
create table if not exists public.delivery_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel_type text not null check (channel_type in ('slack', 'whatsapp', 'teams', 'email')),
  label text,
  -- Slack/Teams: incoming webhook URL. WhatsApp: E.164 phone number.
  -- Email: uses the auth user's email unless overridden here.
  destination text not null,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.delivery_channels is 'A destination (Slack webhook, WhatsApp number, email) a user wants alerts sent to.';

-- ---------------------------------------------------------------------------
-- subscription_channels: many-to-many, which channel(s) each subscription posts to
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_channels (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  delivery_channel_id uuid not null references public.delivery_channels (id) on delete cascade,
  primary key (subscription_id, delivery_channel_id)
);

-- ---------------------------------------------------------------------------
-- alerts_log: audit trail of every alert dispatched (ISO 27001 A.8.15 logging)
-- ---------------------------------------------------------------------------
create table if not exists public.alerts_log (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  agent_id text not null references public.agents (id),
  user_id uuid references auth.users (id) on delete set null,
  delivery_channel_id uuid references public.delivery_channels (id) on delete set null,
  payload jsonb not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.alerts_log is 'Immutable audit log of alert dispatch attempts, for debugging and compliance.';

create index if not exists alerts_log_created_at_idx on public.alerts_log (created_at desc);
create index if not exists alerts_log_user_id_idx on public.alerts_log (user_id);

-- ---------------------------------------------------------------------------
-- companies_cache: local cache of Companies House incorporation records
-- (Agent 1), so re-runs are idempotent and we never alert twice for the
-- same company.
-- ---------------------------------------------------------------------------
create table if not exists public.companies_cache (
  company_number text primary key,
  company_name text not null,
  incorporation_date date,
  sic_codes text[] default '{}',
  address jsonb,
  postcode text,
  raw jsonb not null,
  first_seen_at timestamptz not null default now()
);

create index if not exists companies_cache_postcode_idx on public.companies_cache (postcode);
create index if not exists companies_cache_incorporation_date_idx on public.companies_cache (incorporation_date);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper, reused across tables
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();
