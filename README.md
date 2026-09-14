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

Visit http://localhost:3000. Sign up, confirm your email (check the inbox
tied to your Supabase project — local dev uses Supabase's own email
sending unless you've configured a custom SMTP provider), then log in.

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

## 8. Test the Agent 1 pipeline manually

```bash
npm run agent1:run
```

Runs the same code the scheduled function runs, against yesterday's
Companies House data, using your `.env.local` credentials — useful for
verifying delivery channels work before waiting for the cron schedule.

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
