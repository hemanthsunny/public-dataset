import type { AgentId } from '@/types/database.types'

export interface AgentMeta {
  id: AgentId
  name: string
  tagline: string
  description: string
  problem: string
  dataSource: string
  targetCustomer: string
  deliveryExample: string
  deliveryMode: 'subscription' | 'on_demand'
  monthlyPriceGbp: number | null
  isAvailable: boolean
}

/**
 * Static copy for the marketing site. Mirrors supabase/seed.sql — this
 * duplication is deliberate: marketing pages render at build time and
 * must not depend on a live database call, while the seed data is the
 * source of truth for what a signed-in user can actually subscribe to.
 * Keep the two in sync when an agent's copy or pricing changes.
 */
export const AGENTS: AgentMeta[] = [
  {
    id: 'new-incorporations',
    name: 'New Incorporations',
    tagline: 'Know about new local businesses before your competitors do.',
    description:
      'Daily alerts on newly incorporated companies, filtered by postcode/region and SIC code.',
    problem:
      'Local service businesses want to pitch newly-formed companies before competitors do, but have no way to know a new business opened nearby until it is already trading.',
    dataSource: 'Companies House incorporation feed (free API, daily)',
    targetCustomer:
      'Local B2B service providers: signage, web/branding, EPOS/till systems, business insurance, local accountants.',
    deliveryExample: '/newco Manchester restaurants → list of new incorporations matching your filter',
    deliveryMode: 'subscription',
    monthlyPriceGbp: 25,
    isAvailable: true,
  },
  {
    id: 'dissolutions-strike-offs',
    name: 'Dissolutions & Strike-Offs',
    tagline: 'Early access to distressed-asset opportunities.',
    description:
      'Alerts when a company is being struck off or dissolved, filtered by region/sector.',
    problem:
      'Insolvency practitioners and asset buyers need to know about strike-offs as early as possible — the earlier they know, the better the opportunity.',
    dataSource: 'Companies House dissolution/strike-off notices (free API)',
    targetCustomer: 'Insolvency practitioners, liquidation-sale buyers, business brokers.',
    deliveryExample: 'Filtered alert by region/sector, pushed to your Slack or Teams channel.',
    deliveryMode: 'subscription',
    monthlyPriceGbp: 25,
    isAvailable: true,
  },
  {
    id: 'fsa-hygiene-ratings',
    name: 'FSA Hygiene Ratings',
    tagline: 'Get alerted the moment a hygiene rating changes.',
    description: "Alerts when a restaurant or takeaway's food hygiene rating changes.",
    problem:
      'Consumers have no easy way to know when a favourite spot\'s rating changes; owners want to know the moment a competitor\'s (or their own) rating drops.',
    dataSource: 'food.gov.uk hygiene ratings API (free)',
    targetCustomer: 'Consumers tracking local spots, and restaurant/takeaway owners.',
    deliveryExample: '"The Golden Spoon (200m from you) just dropped to a 2-star hygiene rating."',
    deliveryMode: 'subscription',
    monthlyPriceGbp: 15,
    isAvailable: true,
  },
  {
    id: 'planning-applications',
    name: 'Planning Applications',
    tagline: 'Never miss a nearby planning application again.',
    description: 'Postcode-radius alerts on filed planning applications.',
    problem:
      'Homeowners near a new planning application often find out too late to object; trades want first contact with people who have just filed to renovate.',
    dataSource: 'UK council planning portals (fragmented per-council)',
    targetCustomer: 'Homeowners near filed applications, and trades wanting first-touch leads.',
    deliveryExample: 'Postcode-radius alert via WhatsApp or email.',
    deliveryMode: 'subscription',
    monthlyPriceGbp: 20,
    isAvailable: false,
  },
  {
    id: 'ccj-court-judgments',
    name: 'CCJ / Court Judgments',
    tagline: 'A cheap, fast risk check before you sign.',
    description: 'On-demand lookup of County Court Judgments against a name or company.',
    problem:
      'Landlords vetting tenants and businesses extending trade credit have no quick, cheap way to check for CCJs before committing.',
    dataSource: 'Register of Judgments, Orders and Fines',
    targetCustomer: 'Landlords, small businesses extending trade credit, letting agents.',
    deliveryExample: '"check CCJs for [name]" via Slack/WhatsApp bot — pay-per-lookup, not a subscription.',
    deliveryMode: 'on_demand',
    monthlyPriceGbp: null,
    isAvailable: false,
  },
  {
    id: 'street-works-roadworks',
    name: 'Street Works / Roadworks',
    tagline: 'Route around closures before they cost you the job.',
    description: 'WhatsApp alerts for planned roadworks on your saved regular routes.',
    problem:
      'Van-based trades, couriers, and small delivery operators lose time and money getting stuck in unplanned roadworks.',
    dataSource: 'Council street-works registers (open data)',
    targetCustomer: 'Van-based trades, couriers, small logistics/delivery operators.',
    deliveryExample: '"Road closure on your usual route to [postcode], starts Tuesday."',
    deliveryMode: 'subscription',
    monthlyPriceGbp: 15,
    isAvailable: false,
  },
  {
    id: 'nhs-public-data-watcher',
    name: 'NHS Public Data Watcher',
    tagline: 'Know before you go.',
    description: 'Alerts on shifts in local A&E waiting times and public GP practice ratings.',
    problem:
      'People choosing a GP practice, or deciding whether to travel further for a faster A&E, have no simple alert when local data shifts.',
    dataSource: 'NHS public, non-patient datasets only (A&E waits, GP ratings)',
    targetCustomer: 'Consumers choosing where to seek care; relocation services.',
    deliveryExample: '"Your nearest A&E\'s average wait just spiked — the next one over is faster right now."',
    deliveryMode: 'subscription',
    monthlyPriceGbp: 10,
    isAvailable: false,
  },
]

export function getAgentById(id: string): AgentMeta | undefined {
  return AGENTS.find((agent) => agent.id === id)
}
