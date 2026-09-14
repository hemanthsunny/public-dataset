import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNewIncorporations } from '@/lib/companies-house'

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

describe('fetchNewIncorporations', () => {
  beforeEach(() => {
    process.env.COMPANIES_HOUSE_API_KEY = 'test-api-key'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('throws a clear error when the API key is missing', async () => {
    delete process.env.COMPANIES_HOUSE_API_KEY
    await expect(
      fetchNewIncorporations({ incorporatedFrom: '2026-01-01', incorporatedTo: '2026-01-01' })
    ).rejects.toThrow(/COMPANIES_HOUSE_API_KEY/)
  })

  it('sends HTTP Basic auth built from the API key', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], hits: 0 }))

    await fetchNewIncorporations({ incorporatedFrom: '2026-01-01', incorporatedTo: '2026-01-01' })

    const [call] = fetchMock.mock.calls
    expect(call).toBeDefined()
    const [, init] = call!
    const expectedAuth = `Basic ${Buffer.from('test-api-key:').toString('base64')}`
    expect((init as RequestInit).headers).toMatchObject({ Authorization: expectedAuth })
  })

  it('builds the request with the expected query parameters', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], hits: 0 }))

    await fetchNewIncorporations({
      incorporatedFrom: '2026-01-01',
      incorporatedTo: '2026-01-07',
      sicCodes: ['62012', '62020'],
      size: 50,
    })

    const call = fetchMock.mock.calls[0]
    expect(call).toBeDefined()
    const url = new URL(String(call![0]))
    expect(url.pathname).toBe('/advanced-search/companies')
    expect(url.searchParams.get('incorporated_from')).toBe('2026-01-01')
    expect(url.searchParams.get('incorporated_to')).toBe('2026-01-07')
    expect(url.searchParams.get('company_status')).toBe('active')
    expect(url.searchParams.get('size')).toBe('50')
    expect(url.searchParams.get('start_index')).toBe('0')
    expect(url.searchParams.get('sic_codes')).toBe('62012,62020')
  })

  it('maps Companies House fields onto CompanyIncorporation', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        hits: 1,
        items: [
          {
            company_number: '12345678',
            company_name: 'Acme Signage Ltd',
            date_of_creation: '2026-09-01',
            sic_codes: ['74909'],
            registered_office_address: { postal_code: 'M1 2AB', locality: 'Manchester' },
          },
        ],
      })
    )

    const [company] = await fetchNewIncorporations({
      incorporatedFrom: '2026-09-01',
      incorporatedTo: '2026-09-01',
    })

    expect(company).toMatchObject({
      companyNumber: '12345678',
      companyName: 'Acme Signage Ltd',
      incorporationDate: '2026-09-01',
      sicCodes: ['74909'],
      postcode: 'M1 2AB',
    })
  })

  it('paginates until a short page is returned', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    const makeItem = (n: number) => ({
      company_number: `${n}`,
      company_name: `Company ${n}`,
      date_of_creation: '2026-09-01',
      sic_codes: [],
      registered_office_address: {},
    })

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ items: Array.from({ length: 2 }, (_, i) => makeItem(i)), hits: 3 })
      )
      .mockResolvedValueOnce(jsonResponse({ items: [makeItem(2)], hits: 3 }))

    const results = await fetchNewIncorporations({
      incorporatedFrom: '2026-09-01',
      incorporatedTo: '2026-09-01',
      size: 2,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(3)
  })

  it('throws with the response status and body when the API call fails', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, false, 429))

    await expect(
      fetchNewIncorporations({ incorporatedFrom: '2026-09-01', incorporatedTo: '2026-09-01' })
    ).rejects.toThrow(/429/)
  })
})
