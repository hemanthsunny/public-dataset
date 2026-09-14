# Security Policy

## Reporting a vulnerability

Email the maintainer directly (add your contact address here) rather than
opening a public GitHub issue. Include reproduction steps and the affected
version/commit. Aim to respond within 3 business days.

## Practices this codebase follows

- **Least privilege by default.** Every table has Row Level Security
  enabled (`supabase/migrations/0002_rls_policies.sql`); the browser only
  ever holds the anon key, never the service-role key.
- **Server-only secrets.** The Supabase service-role key, Companies House
  key, and all delivery-channel provider credentials are read only from
  server-side code (Netlify Functions, Route Handlers) — never from
  `NEXT_PUBLIC_*` variables, so they can never end up in a client bundle.
- **Input validation at the edge.** Every form and mutation validates
  through a `zod` schema (`src/lib/validation.ts`) before touching the
  database, independent of RLS.
- **No user enumeration.** Login and password-reset flows return
  identical responses whether or not an email address is registered.
- **Security headers.** CSP, HSTS, X-Frame-Options, and related headers
  are set both in `next.config.mjs` and `netlify.toml` (defence in depth).
- **Audit logging.** Every alert dispatch attempt is written to
  `alerts_log`, including failures, for traceability.
- **Dependency hygiene.** CI runs `npm audit --audit-level=high` on every
  push; keep dependencies updated (Dependabot or Renovate recommended).
- **Secrets never committed.** `.env.example` documents required
  variables with placeholder values only; `.gitignore` excludes all
  `.env*` files except the example.

See `docs/compliance.md` for how these map to ISO/IEC 27001 Annex A
control themes.
