/**
 * Companies House REST API client.
 *
 * Docs: https://developer.company-information.service.gov.uk/
 * Auth: HTTP Basic — API key as username, empty password (same as Postman).
 *
 * Streaming alerts use COMPANIES_HOUSE_STREAM_API_KEY in `worker/`
 * (Fly.io always-on process) — REST and stream keys are not interchangeable.
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

export interface CompanySearchResult {
  companyNumber: string
  companyName: string
  companyStatus: string | null
  companyType: string | null
  incorporationDate: string | null
  addressSnippet: string | null
  raw: Record<string, unknown>
}

interface AdvancedSearchParams {
  incorporatedFrom: string // YYYY-MM-DD
  incorporatedTo: string // YYYY-MM-DD
  sicCodes?: string[]
  size?: number
}

function getRestApiKey(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY
  if (!key) {
    throw new Error('Missing COMPANIES_HOUSE_API_KEY environment variable.')
  }
  return key
}

export function companiesHouseRestAuthHeader(apiKey = getRestApiKey()): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

function authHeader(): string {
  return companiesHouseRestAuthHeader()
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
      results.push(mapIncorporation(item))
    }

    startIndex += size
    if (items.length < size || startIndex >= (body.hits ?? 0)) break
  }

  return results
}

/**
 * Basic company search (name or number) via the REST search endpoint.
 */
export async function searchCompanies(
  query: string,
  options: { size?: number } = {}
): Promise<CompanySearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const size = options.size ?? 10
  const url = new URL('/search/companies', BASE_URL)
  url.searchParams.set('q', q)
  url.searchParams.set('items_per_page', String(size))

  const response = await fetch(url, {
    headers: { Authorization: authHeader() },
  })

  if (!response.ok) {
    throw new Error(
      `Companies House search error ${response.status}: ${await response.text().catch(() => '')}`
    )
  }

  const body = (await response.json()) as { items?: Array<Record<string, any>> }
  return (body.items ?? []).map((item) => ({
    companyNumber: item.company_number,
    companyName: item.title ?? item.company_name ?? 'Unknown company',
    companyStatus: item.company_status ?? null,
    companyType: item.company_type ?? null,
    incorporationDate: item.date_of_creation ?? null,
    addressSnippet: item.address_snippet ?? null,
    raw: item,
  }))
}

/**
 * Lookup a single company by number (REST profile endpoint).
 */
export async function getCompanyProfile(companyNumber: string): Promise<CompanyIncorporation> {
  const number = companyNumber.trim().toUpperCase()
  const response = await fetch(`${BASE_URL}/company/${encodeURIComponent(number)}`, {
    headers: { Authorization: authHeader() },
  })

  if (!response.ok) {
    throw new Error(
      `Companies House profile error ${response.status}: ${await response.text().catch(() => '')}`
    )
  }

  const item = (await response.json()) as Record<string, any>
  return mapIncorporation(item)
}

export function mapIncorporation(item: Record<string, any>): CompanyIncorporation {
  return {
    companyNumber: item.company_number,
    companyName: item.company_name,
    incorporationDate: item.date_of_creation ?? null,
    sicCodes: item.sic_codes ?? [],
    postcode: item.registered_office_address?.postal_code ?? null,
    address: item.registered_office_address ?? null,
    raw: item,
  }
}
