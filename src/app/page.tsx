import Link from 'next/link'
import { AGENTS } from '@/lib/constants/agents'
import { Card } from '@/components/ui/Card'

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
            UK public registers — Companies House, FSA, planning portals, court judgments —
            packaged as targeted, subscribable agents that post straight into Slack, Teams,
            or WhatsApp. No dashboard to remember to check.
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

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Available now</h2>
          <p className="mt-2 text-slate-600">
            Every data source below is free, public, and already has an API — we just deliver
            it to the right person, filtered, in the place they already look.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {liveAgents.map((agent) => (
              <Card key={agent.id}>
                <h3 className="text-lg font-semibold text-slate-900">{agent.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{agent.tagline}</p>
                <p className="mt-4 text-sm text-slate-500">{agent.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">
                    {agent.monthlyPriceGbp ? `£${agent.monthlyPriceGbp}/month` : 'Pay per lookup'}
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
                <span className="text-xs uppercase tracking-wide text-slate-400">Planned</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
