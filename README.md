# Public Data Agents

UK public registers — Companies House, FSA, planning portals, court
judgments — exposed as subscribable alert agents, delivered to Slack,
Teams, WhatsApp, or email. No dashboard to remember to check.

Live product doc: see the original brief this repo implements against
(agent list, target customers, pricing, build order).

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **Supabase** (Postgres, Auth, Row Level Security)
- **Netlify** (hosting + Scheduled Functions for the alert pipeline)
- **Vitest** for unit tests, **GitHub Actions** for CI

## 1. Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account
- A free [Netlify](https://netlify.com) account
- A [Companies House API key](https://developer.company-information.service.gov.uk/) (free, instant)
- A GitHub account, to host the repo and connect to Netlify

## 2. Create your Supabase project

1. Create a new project at supabase.com.
2. In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/seed.sql`
   (Or, once you have the Supabase CLI installed locally: `supabase link --project-ref <ref>` then `supabase db push`.)
3. In **Authentication → URL Configuration**, set your Site URL and add
   `http://localhost:3000/auth/callback` (and your production URL's
   equivalent) as a redirect URL.
4. In **Authentication → Email**, the default "Confirm signup" and
   "Reset password" templates work out of the box with the callback route
   in this repo (`src/app/auth/callback/route.ts`).
5. Copy your Project URL, anon key, and service_role key from
   **Settings → API** — you'll need them in the next step.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local`. Never commit this file (it's already
in `.gitignore`).

## 4. Install and run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000. Without Supabase configured, the app runs in
**demo mode** — open `/login` and use:

- Email: `demo@publicdata.agents`
- Password: `DemoPass123!`

Once Supabase is configured (or `NEXT_PUBLIC_DEMO_MODE=false`), sign up,
confirm your email, then log in.

## 5. Run the test suite

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four are required by CI (`.github/workflows/ci.yml`) before merging
to `main`.

## 6. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Public Data Agents platform"
git branch -M main
git remote add origin https://github.com/<your-username>/public-data-agents.git
git push -u origin main
```

## 7. Deploy to Netlify

1. In Netlify: **Add new site → Import an existing project → GitHub** and
   pick this repo.
2. Netlify will detect `netlify.toml` automatically (build command
   `npm run build`, the `@netlify/plugin-nextjs` plugin, and the
   scheduled function).
3. Under **Site configuration → Environment variables**, add every
   variable from `.env.example` with your real values. At minimum for
   production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your Netlify URL
   or custom domain), `COMPANIES_HOUSE_API_KEY`, and whichever delivery
   provider credentials you're using (Resend/Twilio).
4. Deploy. The scheduled function (`netlify/functions/agent1-new-incorporations.ts`)
   starts running automatically on the cron schedule set in the file
   (`0 6 * * *` — 06:00 UTC daily); check **Functions → Scheduled** in the
   Netlify dashboard to see run history.
5. Add your production URL back into Supabase's **Authentication → URL
   Configuration** redirect list (step 2.3), or auth callbacks will fail
   in production.

## 8. Test Agent 1 (New Incorporations)

Agent 1 runs daily on Netlify (`0 6 * * *` UTC). Locally you can verify
each piece independently.

### 8.1 Confirm Companies House API works

1. Register a free key at
   https://developer.company-information.service.gov.uk/
2. Put it in `.env.local` as `COMPANIES_HOUSE_API_KEY` (no quotes).
3. Run:

```bash
npm run companies-house:test
```

You should see HTTP success and a short list of recently incorporated
companies. A `401 Invalid Authorization` means the key is wrong or
revoked — generate a new one and update `.env.local` (and Netlify env
vars).

Optional wider date window (useful on quiet weekends):

```bash
AGENT1_FROM=2026-09-01 AGENT1_TO=2026-09-14 npm run companies-house:test
```

### 8.2 Link subscriptions to delivery channels

`subscription_channels` is the join table Agent 1 uses to decide where
to send alerts.

- **Subscribe** to an agent → links all of your active delivery channels.
- **Add a delivery channel** → links it to all of your active subscriptions.
- Opening **Dashboard → Agents** also backfills any missing links.

If the table was empty after you already subscribed, open
`/dashboard/agents` once (while logged in) and refresh Supabase — you
should see a row pairing your subscription id with your email channel id.

### 8.3 Run the full Agent 1 pipeline locally

Fill these in `.env.local` (placeholders will be rejected):

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → `service_role`, **not** the anon key)
- `COMPANIES_HOUSE_API_KEY`
- For email channels: `RESEND_API_KEY` + `ALERTS_FROM_EMAIL`

Then:

```bash
npm run agent1:run
```

Override the incorporation date window the same way as the smoke test:

```bash
AGENT1_FROM=2026-09-01 AGENT1_TO=2026-09-14 npm run agent1:run
```

The run will:

1. Fetch incorporations from Companies House for the date window
2. Skip companies already in `companies_cache`
3. Match your active `new-incorporations` subscription filters (e.g. postcode `MK2`)
4. Dispatch to linked channels (or all active channels as a fallback)
5. Write rows to `alerts_log` (`sent` / `failed`)

Check Supabase tables `companies_cache` and `alerts_log` after a
successful run. If `alerts_log.status` is `failed` with a Resend error,
configure Resend before email delivery can succeed.

### 8.4 What “working” looks like for your filter

A subscription with `filters.postcodePrefix = "MK2"` only matches
companies whose registered office postcode starts with `MK2`. If the
date window has new companies but none in MK2, Agent 1 correctly sends
**no** alert for that subscription.

## Project structure

```
src/app/            Next.js App Router pages (marketing, auth, dashboard)
src/components/     Shared UI + feature components
src/lib/            Supabase clients, validation, agent business logic
src/types/          Hand-maintained Supabase database types
supabase/           SQL migrations and seed data
netlify/functions/  Scheduled alert-dispatch pipeline(s)
tests/              Vitest unit tests
docs/               Architecture and compliance notes
```

See `docs/architecture.md` for how the pieces fit together and how to add
a new agent, and `docs/compliance.md` / `SECURITY.md` for the security
practices baked into this codebase.

## Adding the next agent

The build order from the product doc: Agent 1 (New Incorporations, done)
→ Agent 3 (FSA Hygiene Ratings) → Agents 2 & 5 (Companies House/court
data) → Agent 6 (Street Works) → Agent 7 (NHS) → Agent 4 (Planning, most
fragmented, build last). Follow the steps in `docs/architecture.md` under
"Adding a new agent" for each one.
