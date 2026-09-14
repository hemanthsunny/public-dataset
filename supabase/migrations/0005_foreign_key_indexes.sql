-- Performance advisor fix (unindexed_foreign_keys): cover every FK used in
-- joins/filters by the dashboard queries and the alert dispatch pipeline.

create index if not exists alerts_log_agent_id_idx on public.alerts_log (agent_id);
create index if not exists alerts_log_delivery_channel_id_idx on public.alerts_log (delivery_channel_id);
create index if not exists alerts_log_subscription_id_idx on public.alerts_log (subscription_id);
create index if not exists delivery_channels_user_id_idx on public.delivery_channels (user_id);
create index if not exists subscription_channels_delivery_channel_id_idx on public.subscription_channels (delivery_channel_id);
