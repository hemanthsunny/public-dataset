/**
 * Smoke-test the Companies House API key from .env.local.
 *
 *   npm run companies-house:test
 */
import { loadLocalEnv } from './load-env'
import { fetchNewIncorporations } from '../src/lib/companies-house'

loadLocalEnv()

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

async function main() {
  const key = process.env.COMPANIES_HOUSE_API_KEY
  if (!key || key.includes('your-')) {
    console.error('Set COMPANIES_HOUSE_API_KEY in .env.local first.')
    console.error(
      'Register a free key at https://developer.company-information.service.gov.uk/'
    )
    process.exit(1)
  }

  const from = process.env.AGENT1_FROM ?? isoDaysAgo(7)
  const to = process.env.AGENT1_TO ?? isoDaysAgo(0)
  console.log(`Querying Companies House incorporations ${from} → ${to} …`)

  try {
    const companies = await fetchNewIncorporations({
      incorporatedFrom: from,
      incorporatedTo: to,
      size: 5,
    })
    console.log(`OK — returned ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`)
    for (const company of companies.slice(0, 5)) {
      console.log(
        `  ${company.companyNumber}  ${company.companyName}  ${company.postcode ?? '—'}  ${company.incorporationDate ?? '—'}`
      )
    }
    if (companies.length === 0) {
      console.log(
        'No hits in that window (weekends/bank holidays are often quiet). Try a wider range:'
      )
      console.log('  AGENT1_FROM=2026-09-01 AGENT1_TO=2026-09-14 npm run companies-house:test')
    }
  } catch (err) {
    console.error('Companies House request failed:')
    console.error(err instanceof Error ? err.message : err)
    console.error(
      '\nGet a fresh API key at https://developer.company-information.service.gov.uk/ and update COMPANIES_HOUSE_API_KEY.'
    )
    process.exit(1)
  }
}

main()
