/**
 * Injectable poll orchestrator (Node-testable twin of the Edge Function).
 * Keeps network/DB behind deps so regression tests can run without Deno.
 */
import {
  buildCompaniesStreamUrl,
  COMPANIES_STREAM_NAME,
  consumeStreamText,
  isRecentIncorporation,
  mapStreamEventToCompany,
  streamAuthHeader,
  type MappedStreamCompany,
  type StreamEnvelope,
} from '@/lib/companies-house-stream'

export type StreamPollDeps = {
  streamApiKey: string
  readMs?: number
  getTimepoint: () => Promise<number | null>
  saveTimepoint: (timepoint: number) => Promise<void>
  recordEvent: (event: StreamEnvelope) => Promise<void>
  companyExists: (companyNumber: string) => Promise<boolean>
  cacheCompany: (company: MappedStreamCompany) => Promise<void>
  fetchImpl?: typeof fetch
  now?: () => number
}

export type StreamPollResult = {
  eventsRead: number
  recentIncorporations: MappedStreamCompany[]
  lastTimepoint: number | null
  httpStatus: number
}

export async function runCompaniesHouseStreamPoll(
  deps: StreamPollDeps
): Promise<StreamPollResult> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const now = deps.now ?? Date.now
  const readMs = deps.readMs ?? 20_000

  const previous = await deps.getTimepoint()
  const response = await fetchImpl(buildCompaniesStreamUrl(previous), {
    headers: {
      Authorization: streamAuthHeader(deps.streamApiKey),
      Accept: 'application/json',
    },
  })

  if (!response.ok || !response.body) {
    return {
      eventsRead: 0,
      recentIncorporations: [],
      lastTimepoint: previous,
      httpStatus: response.status,
    }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const deadline = now() + readMs
  let pending = ''
  let eventsRead = 0
  let lastTimepoint = previous
  const recentIncorporations: MappedStreamCompany[] = []

  try {
    while (now() < deadline) {
      const { done, value } = await reader.read()
      if (done) break
      const { events, pending: next } = consumeStreamText(
        pending,
        decoder.decode(value, { stream: true })
      )
      pending = next

      for (const event of events) {
        eventsRead++
        await deps.recordEvent(event)
        if (typeof event.event?.timepoint === 'number') {
          lastTimepoint = event.event.timepoint
        }
        const company = mapStreamEventToCompany(event)
        if (!company) continue
        if (!isRecentIncorporation(company, new Date(now()))) continue
        recentIncorporations.push(company)
        if (!(await deps.companyExists(company.companyNumber))) {
          await deps.cacheCompany(company)
        }
      }
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
  }

  if (lastTimepoint != null) {
    await deps.saveTimepoint(lastTimepoint)
  }

  return {
    eventsRead,
    recentIncorporations,
    lastTimepoint,
    httpStatus: response.status,
  }
}

export { COMPANIES_STREAM_NAME }
