-- Seeds the agent catalogue from the product doc. Safe to re-run.
insert into public.agents
  (id, name, tagline, description, data_source, delivery_mode, monthly_price_gbp, is_available, sort_order)
values
  (
    'new-incorporations',
    'New Incorporations',
    'Know about new local businesses before your competitors do.',
    'Daily alerts on newly incorporated companies, filtered by postcode/region and SIC code — a warm lead list for local service providers (signage, web/branding, EPOS, insurance, accountants).',
    'Companies House incorporation feed',
    'subscription',
    25.00,
    true,
    1
  ),
  (
    'dissolutions-strike-offs',
    'Dissolutions & Strike-Offs',
    'Early access to distressed-asset opportunities.',
    'Alerts when a company is being struck off or dissolved, filtered by region/sector — for insolvency practitioners, asset buyers, and liquidation-stock buyers.',
    'Companies House dissolution/strike-off notices',
    'subscription',
    25.00,
    true,
    2
  ),
  (
    'fsa-hygiene-ratings',
    'FSA Hygiene Ratings',
    'Get alerted the moment a hygiene rating changes.',
    'Alerts when a restaurant or takeaway''s food hygiene rating changes — for consumers tracking favourite spots and owners monitoring themselves or competitors.',
    'food.gov.uk hygiene ratings API',
    'subscription',
    15.00,
    true,
    3
  ),
  (
    'planning-applications',
    'Planning Applications',
    'Never miss a nearby planning application again.',
    'Postcode-radius alerts on filed planning applications — an early-warning objection window for homeowners, and first-touch leads for trades.',
    'UK council planning portals',
    'subscription',
    20.00,
    false,
    6
  ),
  (
    'ccj-court-judgments',
    'CCJ / Court Judgments',
    'A cheap, fast risk check before you sign.',
    'On-demand lookup of County Court Judgments against a name or company — for landlords vetting tenants and businesses extending trade credit.',
    'Register of Judgments, Orders and Fines',
    'on_demand',
    null,
    false,
    5
  ),
  (
    'street-works-roadworks',
    'Street Works / Roadworks',
    'Route around closures before they cost you the job.',
    'WhatsApp alerts for planned roadworks on your saved regular routes — built for van-based trades, couriers, and small logistics operators.',
    'Council street-works registers',
    'subscription',
    15.00,
    false,
    4
  ),
  (
    'nhs-public-data-watcher',
    'NHS Public Data Watcher',
    'Know before you go.',
    'Alerts on shifts in local A&E waiting times and public GP practice ratings — for consumers choosing where to seek care (non-patient-specific data only).',
    'NHS public A&E waiting-time stats and GP ratings',
    'subscription',
    10.00,
    false,
    7
  )
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  data_source = excluded.data_source,
  delivery_mode = excluded.delivery_mode,
  monthly_price_gbp = excluded.monthly_price_gbp,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;
