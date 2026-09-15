/**
 * Pure helpers for Companies House Streaming API poll-and-resume.
 * Used by the Supabase Edge Function and covered by unit/regression tests.
 *
 * Auth: Basic — stream API key as username, empty password (same as Postman).
 * Endpoint: GET https://stream.companieshouse.gov.uk/companies?timepoint=…
 */

export const COMPANIES_STREAM_URL = 'https://stream.companieshouse.gov.uk/companies'
export const COMPANIES_STREAM_NAME = 'companies'

export type StreamEnvelope = {
  resource_kind?: string
  resource_uri?: string
  resource_id?: string
  data?: Record<string, any>
  event?: {
    timepoint?: number
    type?: string
    published_at?: string
    fields_changed?: string[]
  }
}

export function streamAuthHeader(streamApiKey: string): string {
  return `Basic ${Buffer.from(`${streamApiKey}:`).toString('base64')}`
}

/** Deno edge runtimes use btoa; Node tests use Buffer — both via this helper. */
export function streamAuthHeaderFromBtoa(
  streamApiKey: string,
  encode: (value: string) => string
): string {
  return `Basic ${encode(`${streamApiKey}:`)}`
}

export function buildCompaniesStreamUrl(timepoint?: number | null): string {
  if (timepoint == null) return COMPANIES_STREAM_URL
  const url = new URL(COMPANIES_STREAM_URL)
  url.searchParams.set('timepoint', String(timepoint))
  return url.toString()
}

/**
 * Incremental NDJSON line parser for a streaming HTTP body.
 * Blank lines are heartbeats and are ignored.
 */
export function consumeStreamText(
  pending: string,
  chunk: string
): { events: StreamEnvelope[]; pending: string } {
  const combined = pending + chunk
  const lines = combined.split('\n')
  const nextPending = lines.pop() ?? ''
  const events: StreamEnvelope[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed) as StreamEnvelope)
    } catch {
      // Skip malformed lines — CH occasionally sends partial noise on reconnect.
    }
  }

  return { events, pending: nextPending }
}

export function latestTimepoint(
  events: StreamEnvelope[],
  previous?: number | null
): number | null {
  let last = previous ?? null
  for (const event of events) {
    const tp = event.event?.timepoint
    if (typeof tp === 'number' && (last == null || tp > last)) last = tp
  }
  return last
}

export type MappedStreamCompany = {
  companyNumber: string
  companyName: string
  incorporationDate: string | null
  sicCodes: string[]
  postcode: string | null
  address: Record<string, unknown> | null
  companyStatus: string | null
  timepoint: number | null
  eventType: string | null
  raw: StreamEnvelope
}

export function mapStreamEventToCompany(event: StreamEnvelope): MappedStreamCompany | null {
  const data = event.data
  if (!data || !data.company_number) return null

  return {
    companyNumber: String(data.company_number),
    companyName: String(data.company_name ?? 'Unknown company'),
    incorporationDate: data.date_of_creation ?? null,
    sicCodes: Array.isArray(data.sic_codes) ? data.sic_codes.map(String) : [],
    postcode: data.registered_office_address?.postal_code ?? null,
    address: data.registered_office_address ?? null,
    companyStatus: data.company_status ?? null,
    timepoint: event.event?.timepoint ?? null,
    eventType: event.event?.type ?? null,
    raw: event,
  }
}

/**
 * Heuristic for Agent 1: treat as a new incorporation when the company is
 * active and date_of_creation is within the recent window (default 3 days).
 * Stream emits many profile changes; we only alert on recent births.
 */
export function isRecentIncorporation(
  company: MappedStreamCompany,
  now = new Date(),
  maxAgeDays = 3
): boolean {
  if (company.eventType === 'deleted') return false
  if (company.companyStatus && company.companyStatus !== 'active') return false
  if (!company.incorporationDate) return false

  const created = new Date(`${company.incorporationDate}T00:00:00Z`)
  if (Number.isNaN(created.getTime())) return false

  const ageMs = now.getTime() - created.getTime()
  const maxMs = maxAgeDays * 24 * 60 * 60 * 1000
  return ageMs >= 0 && ageMs <= maxMs
}

export type PollRunStats = {
  eventsRead: number
  companiesMapped: number
  recentIncorporations: number
  lastTimepoint: number | null
}

/**
 * Process a batch of stream envelopes (after NDJSON parse). Pure — no I/O.
 */
export function summariseStreamBatch(
  events: StreamEnvelope[],
  previousTimepoint?: number | null,
  now = new Date()
): { companies: MappedStreamCompany[]; recent: MappedStreamCompany[]; stats: PollRunStats } {
  const companies = events
    .map(mapStreamEventToCompany)
    .filter((c): c is MappedStreamCompany => c != null)
  const recent = companies.filter((c) => isRecentIncorporation(c, now))
  return {
    companies,
    recent,
    stats: {
      eventsRead: events.length,
      companiesMapped: companies.length,
      recentIncorporations: recent.length,
      lastTimepoint: latestTimepoint(events, previousTimepoint),
    },
  }
}
