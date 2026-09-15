/**
 * End-to-end style smoke for the shared search adapter contract used by
 * New Incorporations (and any future agent search icons).
 */
import { describe, expect, it, vi } from 'vitest'
import type { SearchAdapter } from '@/components/SearchIconButton'

describe('SearchAdapter contract (e2e-style)', () => {
  it('drives a companies search CTA through fetch → results mapping', async () => {
    const urls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      urls.push(String(input))
      return Response.json({
        results: [
          {
            companyNumber: '14083440',
            companyName: 'ACME LTD',
            companyStatus: 'active',
            incorporationDate: '2022-05-05',
            addressSnippet: 'London',
          },
        ],
      })
    }

    const adapter: SearchAdapter<{ companyNumber: string; companyName: string }> = {
      title: 'Search UK companies',
      placeholder: 'Company name or number',
      getKey: (item) => item.companyNumber,
      search: async (query) => {
        const res = await fetchImpl(`/api/companies/search?q=${encodeURIComponent(query)}`)
        const body = (await res.json()) as {
          results: Array<{ companyNumber: string; companyName: string }>
        }
        return body.results
      },
      renderItem: () => null,
    }

    const results = await adapter.search('acme')
    expect(results).toEqual([
      expect.objectContaining({ companyNumber: '14083440', companyName: 'ACME LTD' }),
    ])
    expect(urls[0]).toContain('q=acme')
    expect(vi.isMockFunction(fetchImpl)).toBe(false)
  })
})
