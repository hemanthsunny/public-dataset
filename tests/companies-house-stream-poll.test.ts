import { describe, expect, it, vi } from 'vitest'
import { runCompaniesHouseStreamPoll } from '@/lib/companies-house-stream-poll'

function ndjsonStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i >= lines.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(lines[i] + '\n'))
      i++
    },
  })
}

describe('companies-house stream poll regression', () => {
  it('resumes from saved timepoint, caches new incorporations, and persists cursor', async () => {
    const saved: { timepoint: number | null } = { timepoint: 100 }
    const cached: string[] = []
    const events: unknown[] = []

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      expect(url).toContain('timepoint=100')
      return new Response(
        ndjsonStream([
          JSON.stringify({
            event: { timepoint: 101, type: 'changed' },
            data: {
              company_number: '11111111',
              company_name: 'Fresh Ltd',
              company_status: 'active',
              date_of_creation: '2026-09-14',
              registered_office_address: { postal_code: 'MK2 1AA' },
            },
          }),
          JSON.stringify({
            event: { timepoint: 102, type: 'changed' },
            data: {
              company_number: '22222222',
              company_name: 'Ancient Ltd',
              company_status: 'active',
              date_of_creation: '2019-01-01',
            },
          }),
        ]),
        { status: 200 }
      )
    })

    const result = await runCompaniesHouseStreamPoll({
      streamApiKey: 'stream-key',
      readMs: 5_000,
      now: () => Date.parse('2026-09-15T12:00:00Z'),
      getTimepoint: async () => saved.timepoint,
      saveTimepoint: async (tp) => {
        saved.timepoint = tp
      },
      recordEvent: async (event) => {
        events.push(event)
      },
      companyExists: async (n) => cached.includes(n),
      cacheCompany: async (c) => {
        cached.push(c.companyNumber)
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.eventsRead).toBe(2)
    expect(result.recentIncorporations).toHaveLength(1)
    expect(result.recentIncorporations[0]?.companyNumber).toBe('11111111')
    expect(cached).toEqual(['11111111'])
    expect(saved.timepoint).toBe(102)
    expect(events).toHaveLength(2)

    const call = fetchImpl.mock.calls.at(0) as [unknown, RequestInit?] | undefined
    const headers = call?.[1]?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBe(`Basic ${Buffer.from('stream-key:').toString('base64')}`)
  })

  it('does not double-insert when company already cached', async () => {
    const cacheCompany = vi.fn()
    await runCompaniesHouseStreamPoll({
      streamApiKey: 'stream-key',
      readMs: 5_000,
      now: () => Date.parse('2026-09-15T12:00:00Z'),
      getTimepoint: async () => null,
      saveTimepoint: async () => undefined,
      recordEvent: async () => undefined,
      companyExists: async () => true,
      cacheCompany,
      fetchImpl: (async () =>
        new Response(
          ndjsonStream([
            JSON.stringify({
              event: { timepoint: 1, type: 'changed' },
              data: {
                company_number: '11111111',
                company_name: 'Fresh Ltd',
                company_status: 'active',
                date_of_creation: '2026-09-14',
              },
            }),
          ]),
          { status: 200 }
        )) as unknown as typeof fetch,
    })

    expect(cacheCompany).not.toHaveBeenCalled()
  })

  it('returns safely on stream HTTP errors', async () => {
    const result = await runCompaniesHouseStreamPoll({
      streamApiKey: 'stream-key',
      getTimepoint: async () => null,
      saveTimepoint: async () => undefined,
      recordEvent: async () => undefined,
      companyExists: async () => false,
      cacheCompany: async () => undefined,
      fetchImpl: (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch,
    })
    expect(result.httpStatus).toBe(401)
    expect(result.eventsRead).toBe(0)
  })
})
