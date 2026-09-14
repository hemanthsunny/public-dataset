# Architecture

## Overview

```
                         ┌──────────────────────┐
                         │   Next.js (Netlify)  │
  Browser  ───────────▶  │  App Router + RSC     │ ──▶ Supabase (Postgres + Auth)
                         │  Tailwind UI           │      · RLS-protected tables
                         └──────────────────────┘      · Auth (signup/login)
                                    ▲
                                    │ scheduled (cron)
                         ┌──────────────────────┐
                         │ Netlify Function       │ ──▶ Companies House API
                         │ agent1-new-incorp...   │ ──▶ Slack / Teams / Email / WhatsApp
                         └──────────────────────┘
```

## Why this stack

- **Next.js App Router** — Server Components read Supabase directly with
  the user's session (no separate API layer needed for simple reads);
  Route Handlers cover auth callbacks; static agent pages use ISR
  (`revalidate = 3600`) so marketing content is fast and cheap to serve.
- **Supabase** — Postgres + Auth + Row Level Security in one place. RLS
  means the browser can talk to the database directly for a subscribed
  user's own data without a hand-rolled authorization layer.
- **Netlify** — hosts the Next.js app via `@netlify/plugin-nextjs`, and
  runs the alert pipeline as a Scheduled Function, so there's no separate
  worker/cron service to operate.

## Data model

See `supabase/migrations/0001_init.sql` for the full schema. Summary:

- `profiles` — 1:1 with `auth.users`, public-facing name/company.
- `agents` — catalogue of the 7 data agents (seeded from `supabase/seed.sql`).
- `subscriptions` — a user's subscription to one agent, with a `filters`
  JSONB column (postcode/SIC/region — shape is agent-specific).
- `delivery_channels` — a user's Slack/Teams/WhatsApp/email destinations.
- `subscription_channels` — optional many-to-many linking a subscription
  to specific channels; if empty, the pipeline falls back to all of a
  user's active channels (see `AgentSubscriptionCard.tsx` comments).
- `alerts_log` — audit trail of every dispatch attempt.
- `companies_cache` — dedupe cache for Agent 1 so re-runs never double-alert.

## Adding a new agent

1. Add a row to `supabase/seed.sql` and a matching entry in
   `src/lib/constants/agents.ts` (kept in sync deliberately — see the
   comment there).
2. Write a filter-matching function alongside `src/lib/filters.ts`.
3. Write a Netlify Scheduled Function under `netlify/functions/`,
   following the structure of `agent1-new-incorporations.ts`: fetch →
   dedupe → match subscriptions → dispatch → log.
4. Add a data-source client under `src/lib/` (mirror `companies-house.ts`).
5. Flip `isAvailable: true` for the agent once the pipeline is tested.

## Caching strategy

- Static/marketing pages (`/`, `/agents`, `/agents/[slug]`) revalidate
  hourly (ISR) — see `export const revalidate = 3600`.
- `_next/static/*` build assets are cached for a year (content-hashed
  filenames make this safe) — set in both `next.config.mjs` and
  `netlify.toml`.
- Dashboard pages are always dynamic (per-user data, gated by
  `middleware.ts`) and are never cached.
- The client-side Supabase SDK does not cache reads by default; if list
  views grow large, consider adding `@tanstack/react-query` for
  client-side caching/revalidation rather than hand-rolling it.

## Global storage

For file uploads (e.g. exported alert history, user-uploaded logos), use
a Supabase Storage bucket with its own RLS-style policies (Storage
policies, configured in the Supabase dashboard or via SQL against
`storage.objects`). None is created by default since no agent currently
needs file storage — add one via a new migration when needed, following
the same owner-only policy pattern used for the tables above.
