-- Acquisition Opportunity tool: reference dataset of per-local-authority
-- business density metrics, sourced from the FSA food hygiene ratings open
-- data register (https://ratings.food.gov.uk/open-data, Open Government
-- Licence). Every row carries full provenance (source_url, fetch_date,
-- is_exact, sample_size, scale_factor, method_notes) so every number shown
-- in the UI can be traced back to exactly how it was derived.

create table if not exists public.la_opportunity_metrics (
  id uuid primary key default gen_random_uuid(),
  la_name text not null unique,
  region text not null,
  population integer not null,
  food_total integer not null
);

alter table public.la_opportunity_metrics
  add column if not exists population_source text not null default 'ONS mid-year population estimate (approximate, pending verified ONS file import)',
  add column if not exists food_per_10k numeric,
  add column if not exists pubs_est integer,
  add column if not exists pubs_per_10k numeric,
  add column if not exists hotels_est integer,
  add column if not exists hotels_per_10k numeric,
  add column if not exists convenience_est integer,
  add column if not exists convenience_per_10k numeric,
  add column if not exists takeaways_est integer,
  add column if not exists takeaways_per_10k numeric,
  add column if not exists restaurants_est integer,
  add column if not exists restaurants_per_10k numeric,
  add column if not exists is_exact boolean not null default false,
  add column if not exists sample_size integer,
  add column if not exists scale_factor numeric,
  add column if not exists source_url text,
  add column if not exists fetch_date date,
  add column if not exists method_notes text,
  add column if not exists created_at timestamptz not null default now();

alter table public.la_opportunity_metrics enable row level security;

create policy "opportunity_metrics_select"
  on public.la_opportunity_metrics
  for select
  to authenticated
  using (true);

-- Allow unauthenticated (anon) reads too, since the acquisition finder page
-- is public-facing and should not depend on a signed-in Supabase session.
create policy "opportunity_metrics_select_anon"
  on public.la_opportunity_metrics
  for select
  to anon
  using (true);

comment on table public.la_opportunity_metrics is
  'Reference dataset for the Acquisition Opportunity tool: per-local-authority business density metrics sourced from the FSA food hygiene ratings open data register, with full provenance per row so every number in the UI can be traced back to its source.';
