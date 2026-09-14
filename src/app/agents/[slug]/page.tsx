import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AGENTS, getAgentById } from '@/lib/constants/agents'

export const revalidate = 3600

export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.id }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const agent = getAgentById(params.slug)
  if (!agent) return {}
  return { title: agent.name, description: agent.tagline }
}

export default function AgentDetailPage({ params }: { params: { slug: string } }) {
  const agent = getAgentById(params.slug)
  if (!agent) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/agents" className="text-sm text-brand-600 hover:text-brand-700">
        ← All agents
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">{agent.name}</h1>
      <p className="mt-2 text-lg text-slate-600">{agent.tagline}</p>

      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-slate-500">Data source</dt>
          <dd className="mt-1 text-sm text-slate-900">{agent.dataSource}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-slate-500">Who it's for</dt>
          <dd className="mt-1 text-sm text-slate-900">{agent.targetCustomer}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-slate-500">Pricing</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {agent.monthlyPriceGbp ? `£${agent.monthlyPriceGbp}/month` : 'Pay per lookup'}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-slate-500">Status</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {agent.isAvailable ? 'Available now' : 'Planned — not yet built'}
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">The problem</h2>
        <p className="mt-2 text-sm text-slate-600">{agent.problem}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">What you get</h2>
        <p className="mt-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {agent.deliveryExample}
        </p>
      </section>

      <div className="mt-10">
        <Link
          href={agent.isAvailable ? '/signup' : '/agents'}
          className="inline-block rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {agent.isAvailable ? 'Subscribe' : 'Back to all agents'}
        </Link>
      </div>
    </div>
  )
}
