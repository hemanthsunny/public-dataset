import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Fake Supabase client — implements just enough of the postgrest-js query
// builder surface for the exact call chains agent1-new-incorporations.ts
// makes, backed by a plain in-memory table store. This lets the whole
// pipeline (dedupe -> match -> dispatch -> log) run as a fast, deterministic
// regression test with no real network or database.
// ---------------------------------------------------------------------------
type Row = Record<string, any>

class FakeQuery implements PromiseLike<{ data: any; error: any }> {
  private filters: Array<[string, any]> = []
  private insertRows: Row[] | null = null
  private singleMode: 'maybe' | 'strict' | null = null

  constructor(
    private table: string,
    private db: Map<string, Row[]>
  ) {}

  select(_columns: string) {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push([column, value])
    return this
  }

  insert(rows: Row | Row[]) {
    this.insertRows = Array.isArray(rows) ? rows : [rows]
    return this
  }

  maybeSingle() {
    this.singleMode = 'maybe'
    return this
  }

  single() {
    this.singleMode = 'strict'
    return this
  }

  private run(): { data: any; error: any } {
    if (this.insertRows) {
      const existing = this.db.get(this.table) ?? []
      this.db.set(this.table, [...existing, ...this.insertRows])
      return { data: this.insertRows, error: null }
    }

    const rows = this.db.get(this.table) ?? []
    const matched = rows.filter((row) => this.filters.every(([col, val]) => row[col] === val))

    if (this.singleMode === 'maybe') {
      return { data: matched[0] ?? null, error: null }
    }
    if (this.singleMode === 'strict') {
      return { data: matched[0] ?? null, error: matched[0] ? null : { message: 'Not found' } }
    }
    return { data: matched, error: null }
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

class FakeSupabaseClient {
  db = new Map<string, Row[]>()

  seed(table: string, rows: Row[]) {
    this.db.set(table, rows)
  }

  rows(table: string): Row[] {
    return this.db.get(table) ?? []
  }

  from(table: string) {
    return new FakeQuery(table, this.db)
  }
}

let fakeClient: FakeSupabaseClient

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => fakeClient),
}))

const fetchNewIncorporationsMock = vi.fn()
vi.mock('@/lib/companies-house', () => ({
  fetchNewIncorporations: (...args: unknown[]) => fetchNewIncorporationsMock(...args),
}))

const dispatchToChannelMock = vi.fn()
vi.mock('@/lib/dispatch', () => ({
  dispatchToChannel: (...args: unknown[]) => dispatchToChannelMock(...args),
}))

const ORIGINAL_ENV = { ...process.env }

function makeCompany(overrides: Partial<Record<string, any>> = {}) {
  return {
    companyNumber: '11111111',
    companyName: 'Acme Ltd',
    incorporationDate: '2026-09-01',
    sicCodes: ['62012'],
    postcode: 'M1 2AB',
    address: {},
    raw: {},
    ...overrides,
  }
}

describe('agent1-new-incorporations pipeline', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    delete process.env.INTERNAL_FUNCTION_SECRET
    delete process.env.AGENT1_FROM
    delete process.env.AGENT1_TO
    fakeClient = new FakeSupabaseClient()
    fetchNewIncorporationsMock.mockReset()
    dispatchToChannelMock.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  async function loadHandler() {
    const mod = await import('../netlify/functions/agent1-new-incorporations')
    return mod.default as (request: Request) => Promise<Response>
  }

  it('dispatches to a subscriber whose filter matches, and logs the alert as sent', async () => {
    fetchNewIncorporationsMock.mockResolvedValue([makeCompany({ postcode: 'M1 2AB' })])
    fakeClient.seed('subscriptions', [
      {
        id: 'sub-1',
        user_id: 'user-1',
        agent_id: 'new-incorporations',
        status: 'active',
        filters: { postcodePrefix: 'M1' },
      },
    ])
    fakeClient.seed('subscription_channels', [])
    fakeClient.seed('delivery_channels', [
      { id: 'chan-1', user_id: 'user-1', channel_type: 'slack', destination: 'https://hooks.slack.com/x', is_active: true },
    ])

    const handler = await loadHandler()
    const result = await handler(new Request('https://internal/agent1'))
    const body = await result.json()

    expect(body.alertsSent).toBe(1)
    expect(body.alertsFailed).toBe(0)
    expect(dispatchToChannelMock).toHaveBeenCalledTimes(1)

    const alertsLog = fakeClient.rows('alerts_log')
    expect(alertsLog).toHaveLength(1)
    expect(alertsLog[0]).toMatchObject({ status: 'sent', subscription_id: 'sub-1', agent_id: 'new-incorporations' })

    // The company should now be cached so a second run doesn't re-alert it.
    expect(fakeClient.rows('companies_cache')).toHaveLength(1)
  })

  it('does not alert a subscriber whose filter does not match', async () => {
    fetchNewIncorporationsMock.mockResolvedValue([makeCompany({ postcode: 'M1 2AB' })])
    fakeClient.seed('subscriptions', [
      {
        id: 'sub-1',
        user_id: 'user-1',
        agent_id: 'new-incorporations',
        status: 'active',
        filters: { postcodePrefix: 'SW1A' },
      },
    ])
    fakeClient.seed('subscription_channels', [])
    fakeClient.seed('delivery_channels', [
      { id: 'chan-1', user_id: 'user-1', channel_type: 'slack', destination: 'https://hooks.slack.com/x', is_active: true },
    ])

    const handler = await loadHandler()
    const result = await handler(new Request('https://internal/agent1'))
    const body = await result.json()

    expect(body.alertsSent).toBe(0)
    expect(dispatchToChannelMock).not.toHaveBeenCalled()
    expect(fakeClient.rows('alerts_log')).toHaveLength(0)
  })

  it('skips a company already present in companies_cache (idempotent re-run)', async () => {
    fetchNewIncorporationsMock.mockResolvedValue([makeCompany({ companyNumber: '99999999' })])
    fakeClient.seed('companies_cache', [{ company_number: '99999999' }])
    fakeClient.seed('subscriptions', [
      {
        id: 'sub-1',
        user_id: 'user-1',
        agent_id: 'new-incorporations',
        status: 'active',
        filters: {},
      },
    ])
    fakeClient.seed('subscription_channels', [])
    fakeClient.seed('delivery_channels', [
      { id: 'chan-1', user_id: 'user-1', channel_type: 'slack', destination: 'https://hooks.slack.com/x', is_active: true },
    ])

    const handler = await loadHandler()
    const result = await handler(new Request('https://internal/agent1'))
    const body = await result.json()

    expect(body.message).toMatch(/No new companies/)
    expect(dispatchToChannelMock).not.toHaveBeenCalled()
  })

  it('prefers channels explicitly linked via subscription_channels over the account-wide fallback', async () => {
    fetchNewIncorporationsMock.mockResolvedValue([makeCompany()])
    fakeClient.seed('subscriptions', [
      {
        id: 'sub-1',
        user_id: 'user-1',
        agent_id: 'new-incorporations',
        status: 'active',
        filters: {},
      },
    ])
    fakeClient.seed('subscription_channels', [
      {
        subscription_id: 'sub-1',
        delivery_channel_id: 'chan-linked',
        delivery_channels: {
          id: 'chan-linked',
          channel_type: 'slack',
          destination: 'https://hooks.slack.com/linked',
          is_active: true,
        },
      },
    ])
    // An extra account-wide channel that should NOT receive this alert,
    // since a subscription-specific channel is already linked.
    fakeClient.seed('delivery_channels', [
      { id: 'chan-fallback', user_id: 'user-1', channel_type: 'email', destination: 'user@example.com', is_active: true },
    ])

    const handler = await loadHandler()
    await handler(new Request('https://internal/agent1'))

    expect(dispatchToChannelMock).toHaveBeenCalledTimes(1)
    expect(dispatchToChannelMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chan-linked' }),
      expect.anything()
    )
  })

  it('logs a failed dispatch without throwing, and keeps processing other channels', async () => {
    fetchNewIncorporationsMock.mockResolvedValue([makeCompany()])
    fakeClient.seed('subscriptions', [
      {
        id: 'sub-1',
        user_id: 'user-1',
        agent_id: 'new-incorporations',
        status: 'active',
        filters: {},
      },
    ])
    fakeClient.seed('subscription_channels', [])
    fakeClient.seed('delivery_channels', [
      { id: 'chan-bad', user_id: 'user-1', channel_type: 'slack', destination: 'https://hooks.slack.com/bad', is_active: true },
      { id: 'chan-good', user_id: 'user-1', channel_type: 'email', destination: 'user@example.com', is_active: true },
    ])
    dispatchToChannelMock.mockImplementation(async (channel: { id: string }) => {
      if (channel.id === 'chan-bad') throw new Error('webhook 404')
    })

    const handler = await loadHandler()
    const result = await handler(new Request('https://internal/agent1'))
    const body = await result.json()

    expect(body.alertsSent).toBe(1)
    expect(body.alertsFailed).toBe(1)
    const statuses = fakeClient.rows('alerts_log').map((r) => r.status).sort()
    expect(statuses).toEqual(['failed', 'sent'])
    const failedRow = fakeClient.rows('alerts_log').find((r) => r.status === 'failed')
    expect(failedRow?.error_message).toMatch(/webhook 404/)
  })

  it('rejects an unauthenticated manual invocation when INTERNAL_FUNCTION_SECRET is set', async () => {
    process.env.INTERNAL_FUNCTION_SECRET = 'super-secret'
    fetchNewIncorporationsMock.mockResolvedValue([])

    const handler = await loadHandler()
    const result = await handler(new Request('https://internal/agent1'))

    expect(result.status).toBe(403)
    expect(fetchNewIncorporationsMock).not.toHaveBeenCalled()
  })

  it('allows the request through when it carries the correct internal secret header', async () => {
    process.env.INTERNAL_FUNCTION_SECRET = 'super-secret'
    fetchNewIncorporationsMock.mockResolvedValue([])

    const handler = await loadHandler()
    const result = await handler(
      new Request('https://internal/agent1', { headers: { 'x-internal-secret': 'super-secret' } })
    )

    expect(result.status).toBe(200)
  })

  it("allows Netlify's own scheduled invocation through even without the secret header", async () => {
    process.env.INTERNAL_FUNCTION_SECRET = 'super-secret'
    fetchNewIncorporationsMock.mockResolvedValue([])

    const handler = await loadHandler()
    const result = await handler(
      new Request('https://internal/agent1', { headers: { 'x-nf-event': 'schedule' } })
    )

    expect(result.status).toBe(200)
  })
})
