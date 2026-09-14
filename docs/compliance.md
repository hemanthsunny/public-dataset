# Compliance notes (ISO/IEC 27001-minded)

This project is **not ISO 27001 certified** — certification applies to an
organization's information security management system (ISMS) as a whole
(policies, risk assessments, audits, staff training), not to a codebase in
isolation. What this document does is map the concrete technical controls
already built into this repo to the Annex A control themes they support,
so that if/when you pursue certification, the technical half of the work
is already done and documented.

| Annex A theme | What this repo does |
| --- | --- |
| A.5 Access control | Supabase Auth for identity; Row Level Security on every table restricts data access to its owner (`supabase/migrations/0002_rls_policies.sql`); no shared/service credentials in client code. |
| A.8.2 Privileged access | The service-role key (bypasses RLS) is confined to Netlify Functions and never exposed to `NEXT_PUBLIC_*` or the browser bundle. |
| A.8.3 Information access restriction | Dashboard routes are gated by `middleware.ts`, which redirects unauthenticated users before any protected page renders. |
| A.8.15 Logging | `alerts_log` records every alert dispatch attempt (sent/failed/skipped) with a timestamp and error message where applicable. |
| A.8.16 Monitoring | `/api/health` gives uptime monitors a dependency-free liveness check; CI failures block merges to `main`. |
| A.8.24 Cryptography | All traffic is TLS-only in production (Netlify enforces HTTPS; HSTS header set with `preload`). Supabase encrypts data at rest. |
| A.8.25–8.29 Secure development | CI runs lint, type-check, unit tests, build, and a dependency audit on every push (`.github/workflows/ci.yml`). Zod validation at every input boundary. |
| A.8.31 Environment separation | `.env.example` documents config; real secrets live only in Netlify/GitHub environment variables, per-environment (`netlify.toml` `[context.*]` blocks). |
| A.5.34 Privacy / data minimisation | Only the data needed to deliver alerts is stored (see `docs/architecture.md` for the schema); no patient-level or otherwise regulated NHS data is collected (Agent 7 is explicitly scoped to public, non-patient datasets — see the product doc). |
| A.5.19–5.22 Supplier relationships | Third-party data sources (Companies House, FSA, NHS public datasets) are all public/government APIs with published terms; check current terms before scaling usage, particularly for CCJ data (Agent 5), which is paid-per-search at source. |

## Recommended next steps toward a real ISMS

1. Write a data retention policy for `alerts_log` and `companies_cache`
   (e.g. auto-purge after 12 months) and implement it as a scheduled
   cleanup function.
2. Add a Data Processing Agreement / privacy policy page before
   collecting real user emails or phone numbers at scale — the WhatsApp
   and email delivery channels are personal data under UK GDPR.
3. Enable Supabase's built-in audit logs and point them at a retained log
   sink if pursuing certification.
4. Run a third-party penetration test before onboarding paying customers,
   and keep records of remediation (A.8.29).
5. Define and document an incident response process (who is notified,
   within what timeframe, per UK GDPR's 72-hour breach notification rule).
