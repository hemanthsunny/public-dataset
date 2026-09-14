import { createClient } from '@/lib/supabase/server'
import { ChannelsManager } from './ChannelsManager'
import { DEMO_CHANNELS, isDemoMode } from '@/lib/demo'

export default async function DashboardChannelsPage() {
  let channels = DEMO_CHANNELS.map((c) => ({ ...c }))

  if (!isDemoMode()) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('delivery_channels')
      .select('id, channel_type, label, destination, is_active, is_verified')
      .order('created_at', { ascending: true })
    channels = (data as typeof channels) ?? []
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Delivery channels</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add a Slack or Teams incoming webhook, a WhatsApp number, or an email address. Alerts
        for your active subscriptions go to every active channel below.
      </p>
      <div className="mt-6">
        <ChannelsManager initialChannels={channels} demoMode={isDemoMode()} />
      </div>
    </div>
  )
}
