import { createClient } from '@/lib/supabase/server'
import { AGENTS } from '@/lib/constants/agents'
import { AgentSubscriptionCard } from './AgentSubscriptionCard'
import { DEMO_CHANNELS, DEMO_SUBSCRIPTIONS, isDemoMode } from '@/lib/demo'
import { getSessionUser } from '@/lib/session'
import { syncUserSubscriptionChannels } from '@/lib/subscription-channels'

export default async function DashboardAgentsPage() {
  let subscriptions = DEMO_SUBSCRIPTIONS.map(({ id, agent_id, status, filters }) => ({
    id,
    agent_id,
    status,
    filters,
  }))
  let channels = DEMO_CHANNELS.map(({ id, channel_type, label, destination, is_active }) => ({
    id,
    channel_type,
    label,
    destination,
    is_active,
  }))

  if (!isDemoMode()) {
    const supabase = await createClient()
    const user = await getSessionUser()

    if (user?.id) {
      // Backfill subscription_channels for users who subscribed before linking existed.
      await syncUserSubscriptionChannels(supabase, user.id)
    }

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, agent_id, status, filters')
      .eq('user_id', user?.id ?? '')

    const { data: chans } = await supabase
      .from('delivery_channels')
      .select('id, channel_type, label, destination, is_active')
      .eq('is_active', true)

    subscriptions = (subs as typeof subscriptions) ?? []
    channels = (chans as typeof channels) ?? []
  }

  const subsByAgent = new Map(subscriptions.map((s) => [s.agent_id, s]))

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Agents</h1>
      <p className="mt-1 text-sm text-slate-600">
        Subscribe to the agents you need, set your filters, and choose where alerts go.
      </p>

      {(!channels || channels.length === 0) && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You haven&apos;t added a delivery channel yet — alerts have nowhere to go until you{' '}
          <a href="/dashboard/channels" className="font-medium underline">
            add one
          </a>
          .
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {AGENTS.filter((a) => a.isAvailable).map((agent) => (
          <AgentSubscriptionCard
            key={agent.id}
            agent={agent}
            subscription={subsByAgent.get(agent.id) ?? null}
            channels={channels ?? []}
            demoMode={isDemoMode()}
          />
        ))}
      </div>
    </div>
  )
}
