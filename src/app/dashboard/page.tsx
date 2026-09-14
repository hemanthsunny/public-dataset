import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { getAgentById } from '@/lib/constants/agents'

export default async function DashboardOverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, agent_id, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: recentAlerts } = await supabase
    .from('alerts_log')
    .select('id, agent_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
      </h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-500">Active subscriptions</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{subscriptions?.length ?? 0}</p>
          <Link
            href="/dashboard/agents"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Manage agents →
          </Link>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-500">Recent alerts</h2>
          {recentAlerts && recentAlerts.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="flex justify-between gap-3">
                  <span>{getAgentById(alert.agent_id)?.name ?? alert.agent_id}</span>
                  <span className="text-slate-400">
                    {new Date(alert.created_at).toLocaleDateString('en-GB')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No alerts yet.</p>
          )}
        </Card>
      </div>

      {(!subscriptions || subscriptions.length === 0) && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">Get your first alert set up</h2>
          <p className="mt-2 text-sm text-slate-600">
            Subscribe to an agent and connect a Slack, Teams, WhatsApp, or email destination —
            takes about two minutes.
          </p>
          <Link
            href="/dashboard/agents"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Browse agents
          </Link>
        </Card>
      )}
    </div>
  )
}
