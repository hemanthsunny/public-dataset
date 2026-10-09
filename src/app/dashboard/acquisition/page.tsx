import { createClient } from '@/lib/supabase/server'
import {
  OpportunityExplorer,
  type OpportunityRow,
} from '@/components/acquisition/OpportunityExplorer'
import { isDemoMode } from '@/lib/demo'

// Demo-mode fallback so the page still renders something real-shaped when
// Supabase isn't configured (same convention as the rest of /dashboard).
const DEMO_ROWS: OpportunityRow[] = [
  {
    la_name: 'Babergh',
    region: 'East Counties',
    population: 92400,
    food_total: 886,
    food_per_10k: 95.9,
    pubs_est: 4,
    pubs_per_10k: 0.43,
    hotels_est: 3,
    hotels_per_10k: 0.32,
    convenience_est: 44,
    convenience_per_10k: 4.76,
    takeaways_est: 1,
    takeaways_per_10k: 0.11,
    restaurants_est: 21,
    restaurants_per_10k: 2.27,
    is_exact: true,
    sample_size: 886,
    scale_factor: 1,
    source_url: 'https://ratings.food.gov.uk/api/open-data-files/FHRS297en-GB.xml',
    fetch_date: '2026-10-07',
    method_notes:
      'Exact full count — the FSA file for this area fit in one fetch, every record read.',
    population_source: 'ONS mid-2024 local authority population estimates',
  },
]

export default async function AcquisitionPage() {
  let rows: OpportunityRow[] = DEMO_ROWS
  let demo = true
  let extraSectorCount = 0

  if (!isDemoMode()) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('la_opportunity_metrics')
      .select('*')
      .order('population', { ascending: false })

    if (!error && data && data.length > 0) {
      rows = data as OpportunityRow[]
      demo = false

      // Non-food sectors (IT, manufacturing, ...) live in a separate tidy
      // table so they can grow without a schema change -- see
      // docs/nomis-sector-data.md. Merge them in by la_name; if the table
      // is empty (ingestion hasn't been run yet) this is a no-op and the
      // sector dropdown just shows the FSA-derived sectors as before.
      const { data: sectorRows } = await supabase.from('la_sector_counts').select('*')

      if (sectorRows && sectorRows.length > 0) {
        const byLa = new Map<string, typeof sectorRows>()
        for (const s of sectorRows) {
          const list = byLa.get(s.la_name) ?? []
          list.push(s)
          byLa.set(s.la_name, list)
        }
        const sectorKeys = new Set(sectorRows.map((s) => s.sector_key))
        extraSectorCount = sectorKeys.size

        rows = rows.map((r) => ({
          ...r,
          extra_sectors: (byLa.get(r.la_name) ?? []).map((s) => ({
            key: s.sector_key,
            label: s.sector_label,
            count: s.count,
            per10k: s.per_10k,
            is_exact: s.is_exact,
            source: s.source,
            source_url: s.source_url,
            fetch_date: s.fetch_date,
          })),
        }))
      }
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Acquisition opportunity finder
        </h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {'\u00a399/month'}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Where to look for a pub, hotel, convenience store or similar small business to buy
        — ranked by local market size against how much existing competition is already
        there. Every figure below is traceable: click &ldquo;View details&rdquo; on any
        row to see exactly where it came from.
      </p>

      {demo && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Showing sample data — connect Supabase (or check the{' '}
          <code>la_opportunity_metrics</code> table has rows) to see the live dataset.
        </p>
      )}

      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Coverage: all {rows.length} of 297 England local authorities.</strong>{' '}
        Every area’s food-business total is an exact figure from the FSA register’s own
        header count. Sector breakdowns (pubs, hotels, convenience, takeaways,
        restaurants) are exact for areas small enough to read in full (currently Babergh
        and the Hull &amp; Goole Port authority) and are otherwise estimated from a
        partial sample of that area’s FSA register, scaled to the area’s true total — open
        &ldquo;View details&rdquo; on any row to see the exact sample size and scale
        factor used.{' '}
        {extraSectorCount > 0 ? (
          <>
            {extraSectorCount} non-food sector{extraSectorCount === 1 ? '' : 's'} (IT,
            manufacturing and similar) are in from ONS/Nomis UK Business Counts — open the
            sector dropdown to switch to one. The deprivation-based spending-power index
            isn’t wired in yet.
          </>
        ) : (
          <>
            Non-food sectors (IT, manufacturing and similar) and the deprivation-based
            spending-power index aren’t wired in yet — see{' '}
            <code>docs/nomis-sector-data.md</code> to add them.
          </>
        )}
      </p>

      <div className="mt-6">
        <OpportunityExplorer rows={rows} />
      </div>
    </div>
  )
}
