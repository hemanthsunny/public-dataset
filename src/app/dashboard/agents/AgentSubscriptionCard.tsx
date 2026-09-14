'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscriptionFiltersSchema } from '@/lib/validation'
import { linkSubscriptionToActiveChannels } from '@/lib/subscription-channels'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import type { AgentMeta } from '@/lib/constants/agents'

interface Subscription {
  id: string
  agent_id: string
  status: string
  filters: Record<string, unknown>
}

interface Channel {
  id: string
  channel_type: string
  label: string | null
  destination: string
}

export function AgentSubscriptionCard({
  agent,
  subscription,
  channels,
  demoMode = false,
}: {
  agent: AgentMeta
  subscription: Subscription | null
  channels: Channel[]
  demoMode?: boolean
}) {
  const [isSubscribed, setIsSubscribed] = useState(subscription?.status === 'active')
  const [postcodePrefix, setPostcodePrefix] = useState(
    (subscription?.filters as { postcodePrefix?: string } | undefined)?.postcodePrefix ?? ''
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function toggleSubscription() {
    setError(null)
    setIsSaving(true)

    if (demoMode) {
      setIsSubscribed(!isSubscribed)
      setIsSaving(false)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Your session expired — please log in again.')
      setIsSaving(false)
      return
    }

    const nextStatus = isSubscribed ? 'cancelled' : 'active'
    const { data: upserted, error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          agent_id: agent.id,
          status: nextStatus,
          filters: { postcodePrefix: postcodePrefix || undefined },
        },
        { onConflict: 'user_id,agent_id' }
      )
      .select('id')
      .single()

    if (upsertError) {
      setIsSaving(false)
      setError(upsertError.message)
      return
    }

    if (nextStatus === 'active' && upserted?.id) {
      const { error: linkError } = await linkSubscriptionToActiveChannels(
        supabase,
        upserted.id,
        user.id
      )
      if (linkError) {
        setIsSaving(false)
        setError(linkError)
        return
      }
    }

    setIsSaving(false)
    setIsSubscribed(nextStatus === 'active')
  }

  async function saveFilters() {
    setError(null)
    const parsed = subscriptionFiltersSchema.safeParse({ postcodePrefix })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid filter')
      return
    }

    setIsSaving(true)

    if (demoMode) {
      setSaved(true)
      setIsSaving(false)
      setTimeout(() => setSaved(false), 2000)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsSaving(false)
      return
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          agent_id: agent.id,
          status: isSubscribed ? 'active' : 'cancelled',
          filters: parsed.data,
        },
        { onConflict: 'user_id,agent_id' }
      )
      .select('id')
      .single()

    if (upsertError) {
      setIsSaving(false)
      setError(upsertError.message)
      return
    }

    if (isSubscribed && upserted?.id) {
      const { error: linkError } = await linkSubscriptionToActiveChannels(
        supabase,
        upserted.id,
        user.id
      )
      if (linkError) {
        setIsSaving(false)
        setError(linkError)
        return
      }
    }

    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{agent.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{agent.tagline}</p>
        </div>
        <Button
          variant={isSubscribed ? 'secondary' : 'primary'}
          onClick={toggleSubscription}
          isLoading={isSaving}
          aria-pressed={isSubscribed}
        >
          {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
        </Button>
      </div>

      {isSubscribed && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {error && (
            <div className="mb-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          {saved && (
            <div className="mb-3">
              <Alert tone="success">Filters saved.</Alert>
            </div>
          )}
          {channels.length === 0 ? (
            <p className="text-sm text-amber-700">
              Add a delivery channel to start receiving alerts for this agent.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Alerts will post to all of your active delivery channels.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Field
                label="Postcode area/district"
                name={`postcode-${agent.id}`}
                placeholder="e.g. M1"
                value={postcodePrefix}
                onChange={(e) => setPostcodePrefix(e.target.value.toUpperCase())}
              />
            </div>
            <Button variant="secondary" onClick={saveFilters} isLoading={isSaving}>
              Save filter
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
