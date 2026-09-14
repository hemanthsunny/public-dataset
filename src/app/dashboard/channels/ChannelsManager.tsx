'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deliveryChannelSchema } from '@/lib/validation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'

interface Channel {
  id: string
  channel_type: string
  label: string | null
  destination: string
  is_active: boolean
  is_verified: boolean
}

const CHANNEL_TYPES = [
  { value: 'slack', label: 'Slack', placeholder: 'https://hooks.slack.com/services/…' },
  { value: 'teams', label: 'Microsoft Teams', placeholder: 'https://outlook.office.com/webhook/…' },
  { value: 'whatsapp', label: 'WhatsApp', placeholder: '+447700900000' },
  { value: 'email', label: 'Email', placeholder: 'you@example.com' },
] as const

export function ChannelsManager({ initialChannels }: { initialChannels: Channel[] }) {
  const [channels, setChannels] = useState(initialChannels)
  const [channelType, setChannelType] = useState<(typeof CHANNEL_TYPES)[number]['value']>('slack')
  const [label, setLabel] = useState('')
  const [destination, setDestination] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const selected = CHANNEL_TYPES.find((c) => c.value === channelType)!

  async function addChannel() {
    setError(null)
    const parsed = deliveryChannelSchema.safeParse({ channelType, label: label || undefined, destination })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid channel')
      return
    }

    setIsSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Your session expired — please log in again.')
      setIsSaving(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('delivery_channels')
      .insert({
        user_id: user.id,
        channel_type: parsed.data.channelType,
        label: parsed.data.label ?? null,
        destination: parsed.data.destination,
      })
      .select('id, channel_type, label, destination, is_active, is_verified')
      .single()

    setIsSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setChannels((prev) => [...prev, data])
    setLabel('')
    setDestination('')
  }

  async function removeChannel(id: string) {
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('delivery_channels').delete().eq('id', id)
    if (!deleteError) {
      setChannels((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {channels.length > 0 && (
        <ul className="flex flex-col gap-3">
          {channels.map((channel) => (
            <li key={channel.id}>
              <Card className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {channel.label || CHANNEL_TYPES.find((c) => c.value === channel.channel_type)?.label}
                  </p>
                  <p className="text-xs text-slate-500">{channel.destination}</p>
                </div>
                <Button variant="danger" onClick={() => removeChannel(channel.id)}>
                  Remove
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Add a channel</h2>
        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="channel-type" className="text-sm font-medium text-slate-800">
              Type
            </label>
            <select
              id="channel-type"
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as typeof channelType)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm
                focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CHANNEL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. #new-business-alerts"
          />
          <Field
            label={selected.value === 'whatsapp' ? 'Phone number' : selected.value === 'email' ? 'Email address' : 'Webhook URL'}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={selected.placeholder}
          />
          <Button onClick={addChannel} isLoading={isSaving} className="self-start">
            Add channel
          </Button>
        </div>
      </Card>
    </div>
  )
}
