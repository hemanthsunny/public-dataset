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

Agent 1 has two ingestion paths:

1. **REST batch** (Netlify scheduled function, once daily) — `npm run agent1:run`
2. **Streaming poll-and-resume** (Supabase Edge Function + pg_cron, every ~10 min)

### 8.1 Confirm Companies House REST API works

1. Register a **REST API** application at
   https://developer.company-information.service.gov.uk/
2. Put the key in `.env.local` as `COMPANIES_HOUSE_API_KEY` (Basic Auth username, empty password — same as Postman).
3. Run:

```bash
npm run companies-house:test
```

**Working:** prints `OK — returned N companies`.  
**401:** wrong/revoked key, or you pasted a *streaming* key into the REST slot (they are not interchangeable).

### 8.2 Company search (logged-in UI)

After logging in, open **Dashboard → My agents → New Incorporations** and click the
**search icon** next to the title. That modal calls `GET /api/companies/search`
(REST `/search/companies`) and is only available to authenticated users.

The same `SearchIconButton` component is the shared pattern for any future in-app search.

### 8.3 Streaming alerts via Supabase Edge cron (no Fly/Railway)

Companies House streams support a resumable `timepoint` cursor, so we **poll
for ~20 seconds on a schedule** instead of holding an always-on socket.

1. In the Supabase SQL editor, run migration `0006_stream_state.sql`.
2. Deploy the function:

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase functions deploy companies-house-poll
npx supabase secrets set COMPANIES_HOUSE_STREAM_API_KEY=your-streaming-api-key
```

3. Schedule it (enable `pg_cron` + `pg_net` in Database → Extensions), then:

```sql
select cron.schedule(
  'companies-house-poll',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/companies-house-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || '<SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

4. Manual invoke to verify:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/companies-house-poll" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

Check `stream_state`, `stream_events`, and `companies_cache` afterwards.

### 8.4 Link subscriptions to delivery channels

- **Subscribe** → links all active delivery channels into `subscription_channels`
- **Add a channel** → links it to all active subscriptions
- Opening **Dashboard → Agents** backfills missing links

### 8.5 Full REST Agent 1 pipeline locally

Needs real `SUPABASE_SERVICE_ROLE_KEY`, REST key, and (for email) Resend:

```bash
AGENT1_FROM=2026-09-01 AGENT1_TO=2026-09-14 npm run agent1:run
```

### 8.6 Automated tests

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Coverage includes Companies House REST + stream parsers, poll-and-resume
regression (mocked stream body), search API auth/e2e-style route tests, Agent 1
pipeline, filters, dispatch, and the shared search modal UI.

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
