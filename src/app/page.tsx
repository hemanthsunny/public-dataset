import type { Metadata } from 'next'
import Link from 'next/link'
import { AGENTS } from '@/lib/constants/agents'
import { Card } from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'UK Companies House & public register alerts, delivered to chat',
  description:
    'Get Companies House new incorporation alerts, dissolutions, FSA hygiene ratings and more — filtered and posted to Slack, Teams, WhatsApp or email. No dashboard to check.',
  keywords: [
    'Companies House new incorporations',
    'UK company alerts Slack',
    'new business leads by postcode',
    'Companies House monitoring',
    'public data agents UK',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Public Data Agents — UK public register alerts',
    description:
      'Companies House and UK public-register alerts delivered where you already work.',
    url: '/',
  },
}

interface DataSource {
  name: string
  description: string
  licence: string
}

const DATA_SOURCES: DataSource[] = [
  {
    name: 'Companies House',
    description:
      'New incorporations, dissolutions and strike-offs — the daily company register feed.',
    licence: 'Free API',
  },
  {
    name: 'FSA food hygiene ratings',
    description:
      'Every food business\u2019s hygiene rating and register entry, including pub, hotel, convenience, takeaway and restaurant sub-sectors.',
    licence: 'Open Government Licence',
  },
  {
    name: 'ONS population estimates',
    description:
      'Mid-year population by local authority, used to turn raw counts into like-for-like density.',
    licence: 'Open Government Licence',
  },
  {
    name: 'ONS / Nomis business counts',
    description:
      'Enterprise counts by industry \u2014 IT & communications, manufacturing, professional & scientific services, construction and more.',
    licence: 'Open Government Licence',
  },
]

export default function HomePage() {
  const liveAgents = AGENTS.filter((a) => a.isAvailable)

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            UK public data, made useful
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Public register alerts, delivered where you already work.
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            UK public registers — Companies House, FSA, planning portals, court judgments
            — packaged as targeted, subscribable agents that post straight into Slack,
            Teams, or WhatsApp. No dashboard to remember to check.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Get started free
            </Link>
            <Link
              href="/agents"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Browse all agents
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Built on public data
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            {
              'Every number anywhere on this site traces back to one of these open, free sources \u2014 nothing scraped, nothing paywalled.'
            }
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.name}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="text-sm font-semibold text-slate-900">{source.name}</div>
                <p className="mt-1.5 text-xs text-slate-600">{source.description}</p>
                <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {source.licence}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Available now</h2>
          <p className="mt-2 text-slate-600">
            Every data source below is free, public, and already has an API — we just
            deliver it to the right person, filtered, in the place they already look.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {liveAgents.map((agent) => (
              <Card key={agent.id}>
                <h3 className="text-lg font-semibold text-slate-900">{agent.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{agent.tagline}</p>
                <p className="mt-4 text-sm text-slate-500">{agent.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">
                    {agent.monthlyPriceGbp
                      ? `£${agent.monthlyPriceGbp}/month`
                      : 'Pay per lookup'}
                  </span>
                  <Link
                    href={`/agents/${agent.id}`}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Learn more →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Tools, not just alerts</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              {'\u00a399/month'}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-slate-600">
            Some data is more useful explored than alerted on. The Acquisition Opportunity
            Finder ranks every local authority in England by market size against existing
            competition, for anyone looking to buy a pub, hotel, shop or similar small
            business.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
              <div className="bg-slate-50 p-5">
                <div className="text-2xl font-semibold text-slate-900">297/297</div>
                <div className="mt-1 text-sm text-slate-600">
                  England local authorities covered
                </div>
              </div>
              <div className="bg-slate-50 p-5">
                <div className="text-2xl font-semibold text-slate-900">100%</div>
                <div className="mt-1 text-sm text-slate-600">
                  {'of rows traceable to source \u2014 no black-box numbers'}
                </div>
              </div>
              <div className="bg-slate-50 p-5">
                <div className="text-2xl font-semibold text-slate-900">4+</div>
                <div className="mt-1 text-sm text-slate-600">
                  open data sources, from food & hospitality to IT, manufacturing and more
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">
                {
                  'Filter by region and sector, weight the ranking toward bigger population or lighter competition, then drill into any local authority to see the exact register entries behind its numbers \u2014 live, not a cached snapshot.'
                }
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  {'\u00a399/month'}
                </span>
                <Link
                  href="/signup"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  {'Sign up to try it \u2192'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Coming next</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {AGENTS.filter((a) => !a.isAvailable).map((agent) => (
            <li key={agent.id}>
              <Link
                href={`/agents/${agent.id}`}
                className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-brand-400 hover:text-slate-900"
              >
                <span>{agent.name}</span>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Planned
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
