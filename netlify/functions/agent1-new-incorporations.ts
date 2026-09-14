/**
 * Netlify Scheduled Function — runs daily (see schedule in netlify.toml).
 * Pipeline for Agent 1 (New Incorporations):
 *
 *   1. Pull yesterday's new incorporations from Companies House.
 *   2. Skip anything already in companies_cache (idempotent re-runs).
 *   3. For every active "new-incorporations" subscription, check the
 *      user's filters against each new company.
 *   4. Dispatch a batched alert to every active delivery channel attached
 *      to that subscription.
 *   5. Log every attempt to alerts_log (sent/failed/skipped) for audit.
 *
 * Local dry run: `npm run agent1:run` (uses the same env vars as
 * production — see .env.example).
 */
import type { Config } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { fetchNewIncorporations, type CompanyIncorporation } from '../../src/lib/companies-house'
import { matchesNewIncorporationFilters } from '../../src/lib/filters'
import { dispatchToChannel, type AlertMessage } from '../../src/lib/dispatch'
import type { Database } from '../../src/types/database.types'

const AGENT_ID = 'new-incorporations'

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role configuration.')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

function yesterdayRange(): { from: string; to: string } {
  // Allow local/manual overrides so weekend dry-runs can still find data.
  if (process.env.AGENT1_FROM && process.env.AGENT1_TO) {
    return { from: process.env.AGENT1_FROM, to: process.env.AGENT1_TO }
  }
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setUTCDate(now.getUTCDate() - 1)
  const iso = yesterday.toISOString().slice(0, 10)
  return { from: iso, to: iso }
}

function toAlertMessage(company: CompanyIncorporation): AlertMessage {
  return {
    title: `New incorporation: ${company.companyName}`,
    lines: [
      `Company number: ${company.companyNumber}`,
      company.incorporationDate ? `Incorporated: ${company.incorporationDate}` : '',
      company.postcode ? `Postcode: ${company.postcode}` : '',
      company.sicCodes.length ? `SIC codes: ${company.sicCodes.join(', ')}` : '',
    ].filter(Boolean),
  }
}

export default async function handler(request: Request) {
  const secret = process.env.INTERNAL_FUNCTION_SECRET
  if (secret && request.headers.get('x-internal-secret') !== secret) {
    // Netlify's scheduler invokes this directly and doesn't send custom
    // headers, so this check only guards manual/public invocations when a
    // secret is configured and the request is not from the schedule.
    const isScheduledInvocation = request.headers.get('x-nf-event') === 'schedule'
    if (!isScheduledInvocation) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const supabase = getServiceRoleClient()
  const { from, to } = yesterdayRange()

  const companies = await fetchNewIncorporations({ incorporatedFrom: from, incorporatedTo: to })

  // De-duplicate against the cache so re-running the function never
  // double-alerts for the same company.
  const newCompanies: CompanyIncorporation[] = []
  for (const company of companies) {
    const { data: existing } = await supabase
      .from('companies_cache')
      .select('company_number')
      .eq('company_number', company.companyNumber)
      .maybeSingle()

    if (!existing) {
      newCompanies.push(company)
      await supabase.from('companies_cache').insert({
        company_number: company.companyNumber,
        company_name: company.companyName,
        incorporation_date: company.incorporationDate,
        sic_codes: company.sicCodes,
        address: company.address,
        postcode: company.postcode,
        raw: company.raw,
      })
    }
  }

  if (newCompanies.length === 0) {
    return Response.json({ processed: 0, message: 'No new companies for this window.' })
  }

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, filters')
    .eq('agent_id', AGENT_ID)
    .eq('status', 'active')

  let alertsSent = 0
  let alertsFailed = 0

  for (const subscription of subscriptions ?? []) {
    const matches = newCompanies.filter((company) =>
      matchesNewIncorporationFilters(company, subscription.filters ?? {})
    )
    if (matches.length === 0) continue

    const { data: subChannels } = await supabase
      .from('subscription_channels')
      .select('delivery_channel_id, delivery_channels(id, channel_type, destination, is_active)')
      .eq('subscription_id', subscription.id)

    const activeChannels = (subChannels ?? [])
      .map((row: any) => row.delivery_channels)
      .filter((c: any) => c && c.is_active)

    // Users who haven't linked channels to this specific subscription yet
    // fall back to all of their active channels (simpler onboarding —
    // see AgentSubscriptionCard.tsx).
    const channelsToUse =
      activeChannels.length > 0
        ? activeChannels
        : (
            await supabase
              .from('delivery_channels')
              .select('id, channel_type, destination, is_active')
              .eq('user_id', subscription.user_id)
              .eq('is_active', true)
          ).data ?? []

    const message: AlertMessage = {
      title: `${matches.length} new compan${matches.length === 1 ? 'y' : 'ies'} match your filter`,
      lines: matches.slice(0, 20).flatMap((c) => toAlertMessage(c).lines.slice(0, 1)),
    }

    for (const channel of channelsToUse) {
      try {
        await dispatchToChannel(channel, message)
        alertsSent++
        await supabase.from('alerts_log').insert({
          subscription_id: subscription.id,
          agent_id: AGENT_ID,
          user_id: subscription.user_id,
          delivery_channel_id: channel.id,
          payload: { matchCount: matches.length, companyNumbers: matches.map((m) => m.companyNumber) },
          status: 'sent',
        })
      } catch (err) {
        alertsFailed++
        await supabase.from('alerts_log').insert({
          subscription_id: subscription.id,
          agent_id: AGENT_ID,
          user_id: subscription.user_id,
          delivery_channel_id: channel.id,
          payload: { matchCount: matches.length },
          status: 'failed',
          error_message: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return Response.json({
    newCompanies: newCompanies.length,
    subscriptionsChecked: subscriptions?.length ?? 0,
    alertsSent,
    alertsFailed,
  })
}

// Runs once a day at 06:00 UTC. Change the cron expression to adjust —
// see https://docs.netlify.com/functions/scheduled-functions/.
export const config: Config = {
  schedule: '0 6 * * *',
}
