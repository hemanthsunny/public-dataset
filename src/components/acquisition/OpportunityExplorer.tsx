'use client'

import { Fragment, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'

/** A non-food sector metric for one local authority, sourced from la_sector_counts
 * (e.g. ONS/Nomis UK Business Counts) rather than the FSA register. Unlike the
 * food sub-sectors below, these are data-driven: add a new sector by inserting
 * rows into la_sector_counts, no code change needed here. */
export interface ExtraSectorMetric {
  key: string
  label: string
  count: number
  per10k: number | null
  is_exact: boolean
  source: string
  source_url: string | null
  fetch_date: string | null
}

export interface OpportunityRow {
  la_name: string
  region: string
  population: number
  population_source: string
  food_total: number
  food_per_10k: number
  pubs_est: number
  pubs_per_10k: number
  hotels_est: number
  hotels_per_10k: number
  convenience_est: number
  convenience_per_10k: number
  takeaways_est: number
  takeaways_per_10k: number
  restaurants_est: number
  restaurants_per_10k: number
  is_exact: boolean
  sample_size: number | null
  scale_factor: number | null
  source_url: string | null
  fetch_date: string | null
  method_notes: string | null
  /** Non-food sectors (IT, manufacturing, ...) merged in from la_sector_counts. */
  extra_sectors?: ExtraSectorMetric[] | null
}

type FoodSectorKey =
  'food' | 'pubs' | 'hotels' | 'convenience' | 'takeaways' | 'restaurants'
type SectorKey = FoodSectorKey | string

const FOOD_SECTORS: {
  key: FoodSectorKey
  label: string
  estField: keyof OpportunityRow
  per10kField: keyof OpportunityRow
}[] = [
  {
    key: 'food',
    label: 'Overall food & hospitality density',
    estField: 'food_total',
    per10kField: 'food_per_10k',
  },
  {
    key: 'pubs',
    label: 'Pubs & bars',
    estField: 'pubs_est',
    per10kField: 'pubs_per_10k',
  },
  {
    key: 'hotels',
    label: 'Hotels & B&Bs',
    estField: 'hotels_est',
    per10kField: 'hotels_per_10k',
  },
  {
    key: 'convenience',
    label: 'Convenience-type retail',
    estField: 'convenience_est',
    per10kField: 'convenience_per_10k',
  },
  {
    key: 'takeaways',
    label: 'Takeaways',
    estField: 'takeaways_est',
    per10kField: 'takeaways_per_10k',
  },
  {
    key: 'restaurants',
    label: 'Restaurants & cafés',
    estField: 'restaurants_est',
    per10kField: 'restaurants_per_10k',
  },
]

/** Resolves a sector's {count, per10k, isExact} for one row, whichever source it comes from. */
function sectorValue(
  row: OpportunityRow,
  key: SectorKey
): { count: number; per10k: number; isExact: boolean; source: string | null } {
  const food = FOOD_SECTORS.find((s) => s.key === key)
  if (food) {
    return {
      count: Number(row[food.estField]),
      per10k: Number(row[food.per10kField]),
      isExact: row.is_exact,
      source: null, // food sectors use the FSA EXACT_TOOLTIP/SAMPLE_TOOLTIP copy instead
    }
  }
  const extra = row.extra_sectors?.find((s) => s.key === key)
  return {
    count: extra?.count ?? 0,
    per10k: extra?.per10k ?? 0,
    isExact: extra?.is_exact ?? true,
    source: extra
      ? `${extra.source}${extra.fetch_date ? ` · fetched ${extra.fetch_date}` : ''}`
      : null,
  }
}

function norm(values: number[], v: number) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return 0.5
  return (v - min) / (max - min)
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const SAMPLE_TOOLTIP =
  'Estimated from a partial sample of this area’s FSA register, scaled to the area’s true total. ' +
  'A value of 0 means none of the sampled records fell in this category — it does not mean the true count is zero. ' +
  'Open "View details" for the exact sample size and scale factor.'
const EXACT_TOOLTIP =
  'Exact count — every record in this area’s FSA register was read, nothing scaled.'

type SortKey = 'name' | 'region' | 'population' | 'sectorPer10k' | 'foodPer10k' | 'score'

interface FsaRecord {
  name: string
  type: string
  rating: string | null
  ratingDate: string | null
  postcode: string | null
  address: string
}

interface FsaDetailState {
  status: 'loading' | 'ready' | 'error'
  records?: FsaRecord[]
  totalInFile?: number
  returned?: number
  itemCount?: number | null
  error?: string
}

export function OpportunityExplorer({ rows }: { rows: OpportunityRow[] }) {
  const [region, setRegion] = useState<string>('All regions')
  const [sector, setSector] = useState<SectorKey>('food')
  const [weight, setWeight] = useState(50) // 0 = pure market size, 100 = pure low-saturation
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [openDetails, setOpenDetails] = useState<string | null>(null)
  const [fsaDetails, setFsaDetails] = useState<Record<string, FsaDetailState>>({})
  const fsaLoadedRef = useRef<Set<string>>(new Set())

  function loadFsaRecords(laName: string, sourceUrl: string) {
    if (fsaLoadedRef.current.has(laName)) return
    fsaLoadedRef.current.add(laName)
    setFsaDetails((prev) => ({ ...prev, [laName]: { status: 'loading' } }))

    fetch(`/api/fsa/records?url=${encodeURIComponent(sourceUrl)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load the live register.')
        setFsaDetails((prev) => ({
          ...prev,
          [laName]: {
            status: 'ready',
            records: data.records,
            totalInFile: data.totalInFile,
            returned: data.returned,
            itemCount: data.itemCount,
          },
        }))
      })
      .catch((err: Error) => {
        fsaLoadedRef.current.delete(laName)
        setFsaDetails((prev) => ({
          ...prev,
          [laName]: { status: 'error', error: err.message },
        }))
      })
  }

  const regions = useMemo(
    () => ['All regions', ...Array.from(new Set(rows.map((r) => r.region))).sort()],
    [rows]
  )

  // Non-food sectors are whatever keys are present in extra_sectors -- new
  // ones (e.g. a new Nomis SIC section) show up automatically once their
  // rows exist in la_sector_counts, no code change needed.
  const dynamicSectors = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const r of rows) {
      for (const s of r.extra_sectors ?? []) {
        if (!byKey.has(s.key)) byKey.set(s.key, s.label)
      }
    }
    return Array.from(byKey, ([key, label]) => ({ key, label }))
  }, [rows])

  const SECTORS = useMemo(
    () => [
      ...FOOD_SECTORS.map((s) => ({ key: s.key as string, label: s.label })),
      ...dynamicSectors,
    ],
    [dynamicSectors]
  )

  const sectorDef = SECTORS.find((s) => s.key === sector) ?? SECTORS[0]

  const overview = useMemo(() => {
    const regionCount = new Set(rows.map((r) => r.region)).size
    const totalFood = rows.reduce((sum, r) => sum + (r.food_total ?? 0), 0)
    const avgDensity = rows.length
      ? rows.reduce((sum, r) => sum + (r.food_per_10k ?? 0), 0) / rows.length
      : 0
    const exactCount = rows.filter((r) => r.is_exact).length
    return { regionCount, totalFood, avgDensity, exactCount }
  }, [rows])

  const scored = useMemo(() => {
    const filtered = rows.filter((r) => region === 'All regions' || r.region === region)
    const pops = filtered.map((r) => r.population)
    const dens = filtered.map((r) => sectorValue(r, sector).per10k)
    const satWeight = weight / 100
    const sizeWeight = 1 - satWeight

    const withScore = filtered.map((r) => {
      const sv = sectorValue(r, sector)
      const sizeScore = norm(pops, r.population) * 100
      const satScore = (1 - norm(dens, sv.per10k)) * 100
      const score = Math.round(sizeWeight * sizeScore + satWeight * satScore)
      return {
        ...r,
        sectorEst: sv.count,
        sectorPer10k: sv.per10k,
        sectorIsExact: sv.isExact,
        sectorSource: sv.source,
        score,
      }
    })

    withScore.sort((a, b) => {
      const key = sortKey
      let av: number | string
      let bv: number | string
      if (key === 'name') {
        av = a.la_name
        bv = b.la_name
      } else if (key === 'region') {
        av = a.region
        bv = b.region
      } else if (key === 'population') {
        av = a.population
        bv = b.population
      } else if (key === 'sectorPer10k') {
        av = a.sectorPer10k
        bv = b.sectorPer10k
      } else if (key === 'foodPer10k') {
        av = a.food_per_10k
        bv = b.food_per_10k
      } else {
        av = a.score
        bv = b.score
      }
      if (typeof av === 'string') return sortDir * av.localeCompare(bv as string)
      return sortDir * ((av as number) - (bv as number))
    })

    return withScore
  }, [rows, region, sector, weight, sortKey, sortDir])

  const topOpportunities = useMemo(
    () => [...scored].sort((a, b) => b.score - a.score).slice(0, 10),
    [scored]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1)
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'region' ? 1 : -1)
    }
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Local authority' },
    { key: 'region', label: 'Region' },
    { key: 'population', label: 'Population' },
    { key: 'sectorPer10k', label: 'Sector / 10k' },
    { key: 'foodPer10k', label: 'Food density / 10k' },
    { key: 'score', label: 'Opportunity score' },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Local authorities
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {rows.length}
            <span className="text-sm font-normal text-slate-400">/297</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Food businesses tracked
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCompact(overview.totalFood)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">exact FSA register totals</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Avg. food density
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {overview.avgDensity.toFixed(1)}
            <span className="text-sm font-normal text-slate-400"> /10k people</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Regions covered
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {overview.regionCount}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {overview.exactCount} areas with exact sector counts
          </div>
        </div>
      </div>

      <Card className="mt-6 flex flex-wrap items-end gap-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Sector (competition measure)
          </label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as SectorKey)}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {SECTORS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[240px] flex-1">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Weighting
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="mt-2 w-full accent-brand-600"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>Favor bigger population</span>
            <span>Favor less competition</span>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">
          {'Top 10 opportunities — '}
          {sectorDef?.label ?? ''}
          {region !== 'All regions' ? ` · ${region}` : ''}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ranked by the opportunity score at the current weighting. Score blends market
          size (population) against competition (sector density per 10k people).
        </p>
        <div className="mt-4 space-y-3">
          {topOpportunities.map((r, i) => (
            <div key={r.la_name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-slate-900">
                  <span className="mr-2 text-xs text-slate-400">{i + 1}</span>
                  {r.la_name}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {r.region}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-600">{r.score}</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${Math.max(r.score, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => toggleSort(h.key)}
                  className={`cursor-pointer whitespace-nowrap px-3 py-2 ${sortKey === h.key ? 'text-brand-700' : ''}`}
                >
                  {h.label} {sortKey === h.key ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {scored.map((r, i) => (
              <Fragment key={r.la_name}>
                <tr
                  key={r.la_name}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    <span className="mr-2 text-xs text-slate-400">{i + 1}</span>
                    {r.la_name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                    {r.region}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {r.population.toLocaleString()}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 tabular-nums"
                    title={
                      r.sectorSource
                        ? `${r.sectorSource}${r.sectorIsExact ? '' : ' · estimated'}`
                        : r.sectorIsExact
                          ? EXACT_TOOLTIP
                          : SAMPLE_TOOLTIP
                    }
                  >
                    {r.sectorEst.toLocaleString()} ({r.sectorPer10k.toFixed(2)}/10k)
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {r.food_per_10k.toFixed(1)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      {r.score}
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className="block h-full rounded-full bg-brand-600"
                          style={{ width: `${r.score}%` }}
                        />
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = openDetails === r.la_name ? null : r.la_name
                        setOpenDetails(next)
                        if (next && r.source_url) loadFsaRecords(next, r.source_url)
                      }}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {openDetails === r.la_name ? 'Hide details' : 'View details'}
                    </button>
                  </td>
                </tr>
                {openDetails === r.la_name && (
                  <tr
                    key={`${r.la_name}-details`}
                    className="border-b border-slate-100 bg-slate-50"
                  >
                    <td colSpan={7} className="px-4 py-4 text-sm text-slate-700">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Where this came from
                          </div>
                          <p className="mt-1">{r.method_notes}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Fetched {r.fetch_date ?? 'unknown date'}
                            {!r.is_exact &&
                              r.sample_size != null &&
                              r.scale_factor != null && (
                                <>
                                  {' '}
                                  · read {r.sample_size.toLocaleString()} records, scaled
                                  ×{Number(r.scale_factor).toFixed(2)} to estimate the
                                  area total
                                </>
                              )}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Population
                          </div>
                          <p className="mt-1 tabular-nums">
                            {r.population.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {r.population_source}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {'FSA register — live preview'}
                          </div>
                          {r.source_url && (
                            <a
                              href={r.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-brand-600 hover:underline"
                            >
                              {'Open raw XML ↗'}
                            </a>
                          )}
                        </div>

                        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {!r.source_url && (
                            <p className="p-3 text-sm text-slate-500">
                              No source file recorded for this area.
                            </p>
                          )}
                          {r.source_url &&
                            fsaDetails[r.la_name]?.status === 'loading' && (
                              <p className="p-3 text-sm text-slate-500">
                                {'Loading live register data…'}
                              </p>
                            )}
                          {r.source_url && fsaDetails[r.la_name]?.status === 'error' && (
                            <p className="p-3 text-sm text-rose-600">
                              {fsaDetails[r.la_name]?.error ??
                                'Could not load the register.'}
                            </p>
                          )}
                          {r.source_url && fsaDetails[r.la_name]?.status === 'ready' && (
                            <>
                              <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 bg-slate-50">
                                    <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                                      <th className="px-2 py-1.5">Business</th>
                                      <th className="px-2 py-1.5">Type</th>
                                      <th className="px-2 py-1.5">Rating</th>
                                      <th className="px-2 py-1.5">Rated</th>
                                      <th className="px-2 py-1.5">Postcode</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(fsaDetails[r.la_name]?.records ?? []).map(
                                      (rec, idx) => (
                                        <tr
                                          key={idx}
                                          className="border-t border-slate-100"
                                        >
                                          <td className="px-2 py-1.5">{rec.name}</td>
                                          <td className="px-2 py-1.5 text-slate-500">
                                            {rec.type}
                                          </td>
                                          <td className="px-2 py-1.5 tabular-nums">
                                            {rec.rating ?? '—'}
                                          </td>
                                          <td className="px-2 py-1.5 text-slate-500">
                                            {rec.ratingDate ?? '—'}
                                          </td>
                                          <td className="px-2 py-1.5 tabular-nums">
                                            {rec.postcode ?? '—'}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <p className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">
                                {'Showing '}
                                {fsaDetails[r.la_name]?.returned}
                                {' of '}
                                {fsaDetails[r.la_name]?.totalInFile?.toLocaleString()}
                                {' records read from the live FSA file'}
                                {fsaDetails[r.la_name]?.itemCount != null &&
                                  ` (register header reports ${fsaDetails[r.la_name]?.itemCount?.toLocaleString()} total)`}
                                .
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
