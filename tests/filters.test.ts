import { describe, expect, it } from 'vitest'
import { matchesNewIncorporationFilters } from '@/lib/filters'
import type { CompanyIncorporation } from '@/lib/companies-house'

function makeCompany(overrides: Partial<CompanyIncorporation> = {}): CompanyIncorporation {
  return {
    companyNumber: '12345678',
    companyName: 'Test Ltd',
    incorporationDate: '2026-09-01',
    sicCodes: ['62012'],
    postcode: 'M1 2AB',
    address: null,
    raw: {},
    ...overrides,
  }
}

describe('matchesNewIncorporationFilters', () => {
  it('matches everything when no filters are set', () => {
    expect(matchesNewIncorporationFilters(makeCompany(), {})).toBe(true)
  })

  it('matches on postcode prefix, ignoring case and spacing', () => {
    const company = makeCompany({ postcode: 'M1 2AB' })
    expect(matchesNewIncorporationFilters(company, { postcodePrefix: 'm1' })).toBe(true)
    expect(matchesNewIncorporationFilters(company, { postcodePrefix: 'SW1A' })).toBe(false)
  })

  it('rejects a postcode filter when the company has no postcode', () => {
    const company = makeCompany({ postcode: null })
    expect(matchesNewIncorporationFilters(company, { postcodePrefix: 'M1' })).toBe(false)
  })

  it('matches on SIC code when any code overlaps', () => {
    const company = makeCompany({ sicCodes: ['62012', '70229'] })
    expect(matchesNewIncorporationFilters(company, { sicCodes: ['70229'] })).toBe(true)
    expect(matchesNewIncorporationFilters(company, { sicCodes: ['99999'] })).toBe(false)
  })

  it('combines postcode and SIC filters with AND semantics', () => {
    const company = makeCompany({ postcode: 'M1 2AB', sicCodes: ['62012'] })
    expect(
      matchesNewIncorporationFilters(company, { postcodePrefix: 'M1', sicCodes: ['62012'] })
    ).toBe(true)
    expect(
      matchesNewIncorporationFilters(company, { postcodePrefix: 'SW1A', sicCodes: ['62012'] })
    ).toBe(false)
  })
})
