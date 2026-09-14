/**
 * Minimal Companies House API client for Agent 1 (New Incorporations).
 *
 * Docs: https://developer.company-information.service.gov.uk/api/docs/
 * Auth: HTTP Basic, API key as the username, empty password.
 *
 * The Advanced Search endpoint's exact query parameters do change
 * occasionally — verify against the current docs before relying on this
 * in production; this client isolates that surface to one file.
 */

const BASE_URL = 'https://api.company-information.service.gov.uk'

export interface CompanyIncorporation {
  companyNumber: string
  companyName: string
  incorporationDate: string | null
  sicCodes: string[]
  postcode: string | null
  address: Record<string, unknown> | null
  raw: Record<string, unknown>
}

interface AdvancedSearchParams {
  incorporatedFrom: string // YYYY-MM-DD
  incorporatedTo: string // YYYY-MM-DD
  sicCodes?: string[]
  size?: number
}

function getApiKey(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY
  if (!key) {
    throw new Error('Missing COMPANIES_HOUSE_API_KEY environment variable.')
  }
  return key
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${getApiKey()}:`).toString('base64')}`
}

/**
 * Fetches recently incorporated companies within a date window, optionally
 * narrowed by SIC code. Paginates internally and returns a flat list.
 */
export async function fetchNewIncorporations(
  params: AdvancedSearchParams
): Promise<CompanyIncorporation[]> {
  const size = params.size ?? 100
  const results: CompanyIncorporation[] = []
  let startIndex = 0
  const maxPages = 10 // hard cap so a bad query can't loop forever

  for (let page = 0; page < maxPages; page++) {
    const url = new URL('/advanced-search/companies', BASE_URL)
    url.searchParams.set('incorporated_from', params.incorporatedFrom)
    url.searchParams.set('incorporated_to', params.incorporatedTo)
    url.searchParams.set('company_status', 'active')
    url.searchParams.set('size', String(size))
    url.searchParams.set('start_index', String(startIndex))
    if (params.sicCodes?.length) {
      url.searchParams.set('sic_codes', params.sicCodes.join(','))
    }

    const response = await fetch(url, {
      headers: { Authorization: authHeader() },
    })

    if (!response.ok) {
      throw new Error(
        `Companies House API error ${response.status}: ${await response.text().catch(() => '')}`
      )
    }

    const body = (await response.json()) as {
      items?: Array<Record<string, any>>
      hits?: number
    }

    const items = body.items ?? []
    for (const item of items) {
      results.push({
        companyNumber: item.company_number,
        companyName: item.company_name,
        incorporationDate: item.date_of_creation ?? null,
        sicCodes: item.sic_codes ?? [],
        postcode: item.registered_office_address?.postal_code ?? null,
        address: item.registered_office_address ?? null,
        raw: item,
      })
    }

    startIndex += size
    if (items.length < size || startIndex >= (body.hits ?? 0)) break
  }

  return results
}
