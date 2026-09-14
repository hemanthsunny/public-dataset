/**
 * Local CLI entry for Agent 1 (New Incorporations).
 *
 * Usage:
 *   npm run agent1:run
 *   AGENT1_FROM=2026-09-01 AGENT1_TO=2026-09-14 npm run agent1:run
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (not the anon key)
 *   COMPANIES_HOUSE_API_KEY
 *   RESEND_API_KEY + ALERTS_FROM_EMAIL  (if any email channels exist)
 */
import { loadLocalEnv } from './load-env'

loadLocalEnv()

async function main() {
  const missing = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'COMPANIES_HOUSE_API_KEY',
  ].filter((key) => {
    const value = process.env[key]
    return !value || value.includes('paste-from') || value.includes('your-')
  })

  if (missing.length) {
    console.error('Missing or placeholder env vars:', missing.join(', '))
    console.error('Copy real values into .env.local (see .env.example), then re-run.')
    process.exit(1)
  }

  const { default: handler } = await import('../netlify/functions/agent1-new-incorporations')

  const headers = new Headers({ 'x-nf-event': 'schedule' })
  const request = new Request('http://localhost/agent1', { method: 'POST', headers })
  const response = await handler(request)
  const body = await response.text()

  console.log('status:', response.status)
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2))
  } catch {
    console.log(body)
  }

  if (!response.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
