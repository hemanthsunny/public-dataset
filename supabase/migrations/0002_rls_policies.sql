-- Row Level Security — every table holding user data is locked down by
-- default; access is granted explicitly per policy. This is the core
-- technical control behind the "users can only see their own data" and
-- "least privilege" requirements referenced in docs/compliance.md.

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.subscriptions enable row level security;
alter table public.delivery_channels enable row level security;
alter table public.subscription_channels enable row level security;
alter table public.alerts_log enable row level security;
alter table public.companies_cache enable row level security;

-- profiles: a user can read/update only their own profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- agents: catalogue is public read-only (needed for the marketing pages
-- and the dashboard's "browse agents" view). Writes are service-role only
-- (no policy = denied for anon/authenticated; service role bypasses RLS).
create policy "agents_select_all" on public.agents
  for select using (is_available = true or auth.role() = 'service_role');

-- subscriptions: strictly owner-only for all operations.
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions_delete_own" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- delivery_channels: strictly owner-only.
create policy "delivery_channels_select_own" on public.delivery_channels
  for select using (auth.uid() = user_id);

create policy "delivery_channels_insert_own" on public.delivery_channels
  for insert with check (auth.uid() = user_id);

create policy "delivery_channels_update_own" on public.delivery_channels
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delivery_channels_delete_own" on public.delivery_channels
  for delete using (auth.uid() = user_id);

-- subscription_channels: owner-only, checked via a join back to subscriptions.
create policy "subscription_channels_select_own" on public.subscription_channels
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = auth.uid()
    )
  );

create policy "subscription_channels_insert_own" on public.subscription_channels
  for insert with check (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = auth.uid()
    )
  );

create policy "subscription_channels_delete_own" on public.subscription_channels
  for delete using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = auth.uid()
    )
  );

-- alerts_log: users may read their own alert history; only the service
-- role (used by the dispatch function) may write.
create policy "alerts_log_select_own" on public.alerts_log
  for select using (auth.uid() = user_id);

-- companies_cache: internal working table for the dispatch pipeline only.
-- No anon/authenticated policy is defined, so it is fully inaccessible to
-- regular users; only the service role (which bypasses RLS) can read/write.
