import { describe, expect, it } from 'vitest'
import {
  buildCompaniesStreamUrl,
  consumeStreamText,
  isRecentIncorporation,
  latestTimepoint,
  mapStreamEventToCompany,
  streamAuthHeader,
  summariseStreamBatch,
  type StreamEnvelope,
} from '@/lib/companies-house-stream'

describe('companies-house-stream helpers', () => {
  it('builds Basic auth with stream key as username and empty password', () => {
    const header = streamAuthHeader('e1e664a8-d795-43f8-91b9-c4ce8495ba4c')
    expect(header).toBe(
      `Basic ${Buffer.from('e1e664a8-d795-43f8-91b9-c4ce8495ba4c:').toString('base64')}`
    )
  })

  it('appends timepoint when resuming', () => {
    expect(buildCompaniesStreamUrl(null)).toBe('https://stream.companieshouse.gov.uk/companies')
    expect(buildCompaniesStreamUrl(187124872486)).toBe(
      'https://stream.companieshouse.gov.uk/companies?timepoint=187124872486'
    )
  })

  it('parses NDJSON chunks across boundaries and ignores heartbeats', () => {
    const first = consumeStreamText('', '{"event":{"timepoint":1}}\n\n{"event":')
    expect(first.events).toHaveLength(1)
    expect(first.events[0]?.event?.timepoint).toBe(1)
    expect(first.pending).toBe('{"event":')

    const second = consumeStreamText(first.pending, '{"timepoint":2}}\n')
    expect(second.events).toHaveLength(1)
    expect(second.events[0]?.event?.timepoint).toBe(2)
    expect(second.pending).toBe('')
  })

  it('skips malformed lines without throwing', () => {
    const { events } = consumeStreamText('', 'not-json\n{"event":{"timepoint":9}}\n')
    expect(events).toHaveLength(1)
    expect(events[0]?.event?.timepoint).toBe(9)
  })

  it('tracks the latest timepoint across a batch', () => {
    const events: StreamEnvelope[] = [
      { event: { timepoint: 10 } },
      { event: { timepoint: 12 } },
      { event: { timepoint: 11 } },
    ]
    expect(latestTimepoint(events, 5)).toBe(12)
  })

  it('maps company profile payloads and detects recent incorporations', () => {
    const event: StreamEnvelope = {
      resource_id: '14083440',
      event: { timepoint: 42, type: 'changed' },
      data: {
        company_number: '14083440',
        company_name: 'Acme Ltd',
        company_status: 'active',
        date_of_creation: '2026-09-14',
        sic_codes: ['62012'],
        registered_office_address: { postal_code: 'MK2 2AA' },
      },
    }
    const company = mapStreamEventToCompany(event)
    expect(company?.companyNumber).toBe('14083440')
    expect(company?.postcode).toBe('MK2 2AA')
    expect(isRecentIncorporation(company!, new Date('2026-09-15T12:00:00Z'))).toBe(true)
    expect(isRecentIncorporation(company!, new Date('2026-10-01T12:00:00Z'))).toBe(false)
  })

  it('summarises a mixed batch for Agent 1 filtering', () => {
    const { recent, stats } = summariseStreamBatch(
      [
        {
          event: { timepoint: 1, type: 'changed' },
          data: {
            company_number: '1',
            company_name: 'New Co',
            company_status: 'active',
            date_of_creation: '2026-09-14',
          },
        },
        {
          event: { timepoint: 2, type: 'changed' },
          data: {
            company_number: '2',
            company_name: 'Old Co',
            company_status: 'active',
            date_of_creation: '2020-01-01',
          },
        },
        {
          event: { timepoint: 3, type: 'deleted' },
          data: {
            company_number: '3',
            company_name: 'Gone',
            company_status: 'active',
            date_of_creation: '2026-09-14',
          },
        },
      ],
      null,
      new Date('2026-09-15T00:00:00Z')
    )

    expect(stats.eventsRead).toBe(3)
    expect(stats.recentIncorporations).toBe(1)
    expect(stats.lastTimepoint).toBe(3)
    expect(recent[0]?.companyNumber).toBe('1')
  })
})
