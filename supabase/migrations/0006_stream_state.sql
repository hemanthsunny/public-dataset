-- Stream poll-and-resume state for Companies House (and future agents).
-- Edge Function `companies-house-poll` reads/writes these with the service role.

create table if not exists public.stream_state (
  stream text primary key,
  timepoint bigint,
  updated_at timestamptz not null default now()
);

comment on table public.stream_state is
  'Resumable cursor (timepoint) per Companies House streaming endpoint.';

create table if not exists public.stream_events (
  id uuid primary key default gen_random_uuid(),
  stream text not null,
  timepoint bigint not null,
  resource_id text,
  event_type text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists stream_events_stream_timepoint_idx
  on public.stream_events (stream, timepoint desc);

comment on table public.stream_events is
  'Optional audit buffer of recent stream payloads for debugging poll runs.';

-- Service role bypasses RLS; lock these down for anon/authenticated.
alter table public.stream_state enable row level security;
alter table public.stream_events enable row level security;

-- No policies for authenticated/anon → only service_role can read/write.
