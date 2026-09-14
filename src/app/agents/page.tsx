import type { Metadata } from 'next'
import Link from 'next/link'
import { AGENTS } from '@/lib/constants/agents'
import { Card } from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Agents',
  description: 'Every UK public-register alert agent — available now and planned.',
}

export const revalidate = 3600 // static content, safe to cache for an hour

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">All agents</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Subscribe to the agents relevant to you. Each one is a single, focused alert —
        combine as many as you need.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <Card key={agent.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{agent.name}</h2>
              {!agent.isAvailable && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  Planned
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{agent.tagline}</p>
            <p className="mt-4 flex-1 text-sm text-slate-500">{agent.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm font-medium text-slate-900">
                {agent.monthlyPriceGbp ? `£${agent.monthlyPriceGbp}/month` : 'Pay per lookup'}
              </span>
              <Link
                href={`/agents/${agent.id}`}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Details →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
