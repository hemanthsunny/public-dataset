import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session', () => ({
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/demo', () => ({
  isDemoMode: vi.fn(() => false),
}))

vi.mock('@/lib/companies-house', () => ({
  searchCompanies: vi.fn(),
}))

import { GET } from '@/app/api/companies/search/route'
import { getSessionUser } from '@/lib/session'
import { isDemoMode } from '@/lib/demo'
import { searchCompanies } from '@/lib/companies-house'

describe('GET /api/companies/search (e2e-ish route)', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.mocked(isDemoMode).mockReturnValue(false)
  })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/companies/search?q=acme'))
    expect(res.status).toBe(401)
  })

  it('returns empty results for short queries', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      fullName: null,
    })
    const res = await GET(new Request('http://localhost/api/companies/search?q=a'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ results: [] })
    expect(searchCompanies).not.toHaveBeenCalled()
  })

  it('calls Companies House REST search for logged-in users', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      fullName: null,
    })
    vi.mocked(searchCompanies).mockResolvedValue([
      {
        companyNumber: '14083440',
        companyName: 'Acme Ltd',
        companyStatus: 'active',
        companyType: 'ltd',
        incorporationDate: '2022-05-05',
        addressSnippet: 'London',
        raw: {},
      },
    ])

    const res = await GET(new Request('http://localhost/api/companies/search?q=acme'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.results[0].companyNumber).toBe('14083440')
    expect(searchCompanies).toHaveBeenCalledWith('acme', { size: 10 })
  })

  it('serves demo fixtures when demo mode is on', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'demo',
      email: 'demo@publicdata.agents',
      fullName: 'Demo',
    })
    vi.mocked(isDemoMode).mockReturnValue(true)

    const res = await GET(new Request('http://localhost/api/companies/search?q=demo'))
    const body = await res.json()
    expect(body.results[0].companyNumber).toBe('14083440')
    expect(searchCompanies).not.toHaveBeenCalled()
  })
})
