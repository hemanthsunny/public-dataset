-- Generic per-local-authority sector business counts, additive to
-- la_opportunity_metrics (which only covers FSA-registered food &
-- hospitality sub-sectors). This table is deliberately "tidy"/long-format
-- (one row per local authority + sector) rather than one column per
-- sector, so a brand-new sector (e.g. a different SIC section) can be
-- added later just by inserting rows -- no schema migration required.
--
-- Initial use: ONS/Nomis "UK Business Counts" (enterprises by 2007 SIC
-- industry section and local authority), which covers non-food sectors
-- the FSA register has no visibility into at all -- IT & communications,
-- manufacturing, professional & scientific services, construction, etc.
-- See docs/nomis-sector-data.md for the exact source, licence and the
-- ingestion script that populates this table.

create table if not exists public.la_sector_counts (
  id uuid primary key default gen_random_uuid(),
  la_name text not null,
  sector_key text not null,
  sector_label text not null,
  count integer not null,
  per_10k numeric,
  is_exact boolean not null default true,
  source text not null,
  source_url text,
  fetch_date date,
  method_notes text,
  created_at timestamptz not null default now(),
  unique (la_name, sector_key)
);

create index if not exists la_sector_counts_sector_key_idx
  on public.la_sector_counts (sector_key);

alter table public.la_sector_counts enable row level security;

-- Same read model as la_opportunity_metrics: this is public reference
-- data shown on a page that should not require a signed-in session.
create policy "sector_counts_select"
  on public.la_sector_counts
  for select
  to authenticated
  using (true);

create policy "sector_counts_select_anon"
  on public.la_sector_counts
  for select
  to anon
  using (true);

comment on table public.la_sector_counts is
  'Per-local-authority business counts by sector, tidy/long format (one row per LA + sector) so new sectors can be added without a migration. Populated from ONS/Nomis UK Business Counts via scripts/fetch-nomis-sectors.ts -- see docs/nomis-sector-data.md.';
