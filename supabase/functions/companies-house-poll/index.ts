/**
 * Supabase Edge Function — Companies House stream poll-and-resume.
 *
 * Schedule every 5–15 minutes via pg_cron + pg_net (see README).
 * Connects with the last saved timepoint, reads NDJSON for ~20s, upserts
 * companies_cache / stream_events, updates stream_state, then exits.
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   COMPANIES_HOUSE_STREAM_API_KEY
 *   SUPABASE_URL (auto)
 *   SUPABASE_SERVICE_ROLE_KEY (auto)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const STREAM_URL = 'https://stream.companieshouse.gov.uk/companies'
const STREAM_NAME = 'companies'
const READ_MS = 20_000

type StreamEnvelope = {
  resource_id?: string
  data?: Record<string, any>
  event?: { timepoint?: number; type?: string }
}

function authHeader(key: string): string {
  return `Basic ${btoa(`${key}:`)}`
}

function buildUrl(timepoint?: number | null): string {
  if (timepoint == null) return STREAM_URL
  return `${STREAM_URL}?timepoint=${timepoint}`
}

function consume(pending: string, chunk: string): { events: StreamEnvelope[]; pending: string } {
  const combined = pending + chunk
  const lines = combined.split('\n')
  const nextPending = lines.pop() ?? ''
  const events: StreamEnvelope[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed))
    } catch {
      /* ignore */
    }
  }
  return { events, pending: nextPending }
}

function isRecentIncorporation(data: Record<string, any>, eventType?: string): boolean {
  if (eventType === 'deleted') return false
  if (data.company_status && data.company_status !== 'active') return false
  if (!data.date_of_creation) return false
  const created = new Date(`${data.date_of_creation}T00:00:00Z`)
  if (Number.isNaN(created.getTime())) return false
  const age = Date.now() - created.getTime()
  return age >= 0 && age <= 3 * 24 * 60 * 60 * 1000
}

Deno.serve(async (_req) => {
  const streamKey = Deno.env.get('COMPANIES_HOUSE_STREAM_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!streamKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing env configuration' }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: stateRow } = await supabase
    .from('stream_state')
    .select('timepoint')
    .eq('stream', STREAM_NAME)
    .maybeSingle()

  let lastTimepoint: number | null = stateRow?.timepoint ?? null
  const url = buildUrl(lastTimepoint)

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader(streamKey),
      Accept: 'application/json',
    },
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: `Stream HTTP ${response.status}`, detail: text.slice(0, 500) }),
      { status: 502 }
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const deadline = Date.now() + READ_MS
  let pending = ''
  let eventsRead = 0
  let recentCount = 0
  const recentCompanies: Array<Record<string, unknown>> = []

  try {
    while (Date.now() < deadline) {
      const { done, value } = await reader.read()
      if (done) break
      const { events, pending: next } = consume(pending, decoder.decode(value, { stream: true }))
      pending = next

      for (const event of events) {
        eventsRead++
        if (typeof event.event?.timepoint === 'number') {
          lastTimepoint = event.event.timepoint
        }

        await supabase.from('stream_events').insert({
          stream: STREAM_NAME,
          timepoint: event.event?.timepoint ?? 0,
          resource_id: event.resource_id ?? event.data?.company_number ?? null,
          event_type: event.event?.type ?? null,
          payload: event,
        })

        const data = event.data
        if (!data?.company_number) continue

        if (isRecentIncorporation(data, event.event?.type)) {
          recentCount++
          recentCompanies.push({
            company_number: data.company_number,
            company_name: data.company_name,
            incorporation_date: data.date_of_creation ?? null,
            sic_codes: data.sic_codes ?? [],
            address: data.registered_office_address ?? null,
            postcode: data.registered_office_address?.postal_code ?? null,
            raw: data,
          })

          const { data: existing } = await supabase
            .from('companies_cache')
            .select('company_number')
            .eq('company_number', data.company_number)
            .maybeSingle()

          if (!existing) {
            await supabase.from('companies_cache').insert({
              company_number: data.company_number,
              company_name: data.company_name,
              incorporation_date: data.date_of_creation ?? null,
              sic_codes: data.sic_codes ?? [],
              address: data.registered_office_address ?? null,
              postcode: data.registered_office_address?.postal_code ?? null,
              raw: data,
            })
          }
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
    await supabase.from('stream_state').upsert({
      stream: STREAM_NAME,
      timepoint: lastTimepoint,
      updated_at: new Date().toISOString(),
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      eventsRead,
      recentIncorporations: recentCount,
      lastTimepoint,
      sample: recentCompanies.slice(0, 5),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
