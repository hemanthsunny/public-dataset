-- Performance advisor fix (auth_rls_initplan): wrap auth.<fn>() calls in a
-- scalar subselect so Postgres evaluates them once per query instead of
-- once per row. Functionally identical to 0002_rls_policies.sql — this
-- file supersedes those policy definitions.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "agents_select_all" on public.agents;
create policy "agents_select_all" on public.agents
  for select using (is_available = true or (select auth.role()) = 'service_role');

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own" on public.subscriptions
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "delivery_channels_select_own" on public.delivery_channels;
create policy "delivery_channels_select_own" on public.delivery_channels
  for select using ((select auth.uid()) = user_id);

drop policy if exists "delivery_channels_insert_own" on public.delivery_channels;
create policy "delivery_channels_insert_own" on public.delivery_channels
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "delivery_channels_update_own" on public.delivery_channels;
create policy "delivery_channels_update_own" on public.delivery_channels
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "delivery_channels_delete_own" on public.delivery_channels;
create policy "delivery_channels_delete_own" on public.delivery_channels
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "subscription_channels_select_own" on public.subscription_channels;
create policy "subscription_channels_select_own" on public.subscription_channels
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "subscription_channels_insert_own" on public.subscription_channels;
create policy "subscription_channels_insert_own" on public.subscription_channels
  for insert with check (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "subscription_channels_delete_own" on public.subscription_channels;
create policy "subscription_channels_delete_own" on public.subscription_channels
  for delete using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "alerts_log_select_own" on public.alerts_log;
create policy "alerts_log_select_own" on public.alerts_log
  for select using ((select auth.uid()) = user_id);
