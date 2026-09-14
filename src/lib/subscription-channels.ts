import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>

async function insertMissingLinks(
  supabase: Client,
  rows: Array<{ subscription_id: string; delivery_channel_id: string }>
): Promise<{ error: string | null; linked: number }> {
  if (rows.length === 0) return { error: null, linked: 0 }

  // Avoid upsert — subscription_channels has no UPDATE RLS policy.
  const { data: existing, error: existingError } = await supabase
    .from('subscription_channels')
    .select('subscription_id, delivery_channel_id')
    .in(
      'subscription_id',
      Array.from(new Set(rows.map((row) => row.subscription_id)))
    )

  if (existingError) return { error: existingError.message, linked: 0 }

  const have = new Set(
    (existing ?? []).map((row) => `${row.subscription_id}:${row.delivery_channel_id}`)
  )
  const missing = rows.filter(
    (row) => !have.has(`${row.subscription_id}:${row.delivery_channel_id}`)
  )
  if (missing.length === 0) return { error: null, linked: 0 }

  const { error } = await supabase.from('subscription_channels').insert(missing)
  return { error: error?.message ?? null, linked: missing.length }
}

/**
 * Links every active delivery channel owned by the user to a subscription.
 * Keeps subscription_channels in sync with the simpler UX ("alerts go to
 * all of your active channels") while still populating the join table the
 * Agent 1 pipeline prefers.
 */
export async function linkSubscriptionToActiveChannels(
  supabase: Client,
  subscriptionId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { data: channels, error: channelsError } = await supabase
    .from('delivery_channels')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (channelsError) return { error: channelsError.message }
  if (!channels?.length) return { error: null }

  const { error } = await insertMissingLinks(
    supabase,
    channels.map((channel) => ({
      subscription_id: subscriptionId,
      delivery_channel_id: channel.id,
    }))
  )
  return { error }
}

/**
 * When a user adds a new delivery channel, attach it to every active
 * subscription so Agent 1 (and future agents) can find it via
 * subscription_channels without relying on the fallback query.
 */
export async function linkChannelToActiveSubscriptions(
  supabase: Client,
  deliveryChannelId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (subsError) return { error: subsError.message }
  if (!subscriptions?.length) return { error: null }

  const { error } = await insertMissingLinks(
    supabase,
    subscriptions.map((subscription) => ({
      subscription_id: subscription.id,
      delivery_channel_id: deliveryChannelId,
    }))
  )
  return { error }
}

/**
 * Backfill missing subscription ↔ channel links for a user. Safe to call
 * on every dashboard load — only inserts rows that do not already exist.
 */
export async function syncUserSubscriptionChannels(
  supabase: Client,
  userId: string
): Promise<{ error: string | null; linked: number }> {
  const [{ data: subscriptions, error: subsError }, { data: channels, error: channelsError }] =
    await Promise.all([
      supabase.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active'),
      supabase.from('delivery_channels').select('id').eq('user_id', userId).eq('is_active', true),
    ])

  if (subsError) return { error: subsError.message, linked: 0 }
  if (channelsError) return { error: channelsError.message, linked: 0 }
  if (!subscriptions?.length || !channels?.length) return { error: null, linked: 0 }

  const rows = subscriptions.flatMap((subscription) =>
    channels.map((channel) => ({
      subscription_id: subscription.id,
      delivery_channel_id: channel.id,
    }))
  )

  return insertMissingLinks(supabase, rows)
}
