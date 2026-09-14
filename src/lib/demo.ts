/**
 * Demo mode lets the app run without a configured Supabase project
 * (e.g. a fresh Netlify deploy). It is on automatically when the
 * public Supabase URL is missing/placeholder, or when
 * NEXT_PUBLIC_DEMO_MODE=true.
 */

export const DEMO_CREDENTIALS = {
  email: 'demo@publicdata.agents',
  password: 'DemoPass123!',
} as const

export const DEMO_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: DEMO_CREDENTIALS.email,
  fullName: 'Demo User',
  companyName: 'Acme Local Services Ltd',
}

export const DEMO_COOKIE = 'pda_demo_session'
export const DEMO_SESSION_VALUE = 'authenticated'

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return true
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'false') return false

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url.includes('your-project-ref') || url.includes('placeholder')
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      anonKey &&
      !url.includes('your-project-ref') &&
      !url.includes('placeholder') &&
      anonKey !== 'your-anon-public-key'
  )
}

export type DemoSubscription = {
  id: string
  agent_id: string
  status: string
  filters: Record<string, unknown>
  created_at: string
}

export type DemoChannel = {
  id: string
  channel_type: string
  label: string | null
  destination: string
  is_active: boolean
  is_verified: boolean
}

export type DemoAlert = {
  id: string
  agent_id: string
  status: string
  created_at: string
}

export const DEMO_SUBSCRIPTIONS: DemoSubscription[] = [
  {
    id: 'demo-sub-1',
    agent_id: 'new-incorporations',
    status: 'active',
    filters: { postcodePrefix: 'M1' },
    created_at: new Date().toISOString(),
  },
]

export const DEMO_CHANNELS: DemoChannel[] = [
  {
    id: 'demo-channel-1',
    channel_type: 'slack',
    label: 'Sales Slack',
    destination: 'https://hooks.slack.com/services/DEMO/CHANNEL/TOKEN',
    is_active: true,
    is_verified: true,
  },
]

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: 'demo-alert-1',
    agent_id: 'new-incorporations',
    status: 'sent',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-alert-2',
    agent_id: 'new-incorporations',
    status: 'sent',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
]
