import type { CompanyIncorporation } from '@/lib/companies-house'

export interface NewIncorporationFilters {
  postcodePrefix?: string
  sicCodes?: string[]
  region?: string
}

/**
 * Pure filter-matching logic, kept separate from the network/dispatch code
 * so it can be unit-tested without any external service (see tests/).
 */
export function matchesNewIncorporationFilters(
  company: CompanyIncorporation,
  filters: NewIncorporationFilters
): boolean {
  if (filters.postcodePrefix) {
    const postcode = company.postcode?.toUpperCase().replace(/\s+/g, '') ?? ''
    const prefix = filters.postcodePrefix.toUpperCase().replace(/\s+/g, '')
    if (!postcode.startsWith(prefix)) return false
  }

  if (filters.sicCodes && filters.sicCodes.length > 0) {
    const hasMatch = company.sicCodes.some((code) => filters.sicCodes!.includes(code))
    if (!hasMatch) return false
  }

  return true
}
