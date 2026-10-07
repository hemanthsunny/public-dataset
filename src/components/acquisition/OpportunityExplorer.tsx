'use client'

import { Fragment, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'

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
}

type SectorKey = 'food' | 'pubs' | 'hotels' | 'convenience' | 'takeaways' | 'restaurants'

const SECTORS: { key: SectorKey; label: string; estField: keyof OpportunityRow; per10kField: keyof OpportunityRow }[] = [
  { key: 'food', label: 'Overall food & hospitality density', estField: 'food_total', per10kField: 'food_per_10k' },
  { key: 'pubs', label: 'Pubs & bars', estField: 'pubs_est', per10kField: 'pubs_per_10k' },
  { key: 'hotels', label: 'Hotels & B&Bs', estField: 'hotels_est', per10kField: 'hotels_per_10k' },
  { key: 'convenience', label: 'Convenience-type retail', estField: 'convenience_est', per10kField: 'convenience_per_10k' },
  { key: 'takeaways', label: 'Takeaways', estField: 'takeaways_est', per10kField: 'takeaways_per_10k' },
  { key: 'restaurants', label: 'Restaurants & cafés', estField: 'restaurants_est', per10kField: 'restaurants_per_10k' },
]

function norm(values: number[], v: number) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return 0.5
  return (v - min) / (max - min)
}

type SortKey = 'name' | 'region' | 'population' | 'sectorPer10k' | 'foodPer10k' | 'score'

export function OpportunityExplorer({ rows }: { rows: OpportunityRow[] }) {
  const [region, setRegion] = useState<string>('All regions')
  const [sector, setSector] = useState<SectorKey>('food')
  const [weight, setWeight] = useState(50) // 0 = pure market size, 100 = pure low-saturation
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [openDetails, setOpenDetails] = useState<string | null>(null)

  const regions = useMemo(
    () => ['All regions', ...Array.from(new Set(rows.map((r) => r.region))).sort()],
    [rows]
  )
  const sectorDef = SECTORS.find((s) => s.key === sector)!

  const scored = useMemo(() => {
    const filtered = rows.filter((r) => region === 'All regions' || r.region === region)
    const pops = filtered.map((r) => r.population)
    const dens = filtered.map((r) => Number(r[sectorDef.per10kField]))
    const satWeight = weight / 100
    const sizeWeight = 1 - satWeight

    const withScore = filtered.map((r) => {
      const sizeScore = norm(pops, r.population) * 100
      const satScore = (1 - norm(dens, Number(r[sectorDef.per10kField]))) * 100
      const score = Math.round(sizeWeight * sizeScore + satWeight * satScore)
      return {
        ...r,
        sectorEst: Number(r[sectorDef.estField]),
        sectorPer10k: Number(r[sectorDef.per10kField]),
        score,
      }
    })

    withScore.sort((a, b) => {
      const key = sortKey
      let av: number | string
      let bv: number | string
      if (key === 'name') { av = a.la_name; bv = b.la_name }
      else if (key === 'region') { av = a.region; bv = b.region }
      else if (key === 'population') { av = a.population; bv = b.population }
      else if (key === 'sectorPer10k') { av = a.sectorPer10k; bv = b.sectorPer10k }
      else if (key === 'foodPer10k') { av = a.food_per_10k; bv = b.food_per_10k }
      else { av = a.score; bv = b.score }
      if (typeof av === 'string') return sortDir * av.localeCompare(bv as string)
      return sortDir * ((av as number) - (bv as number))
    })

    return withScore
  }, [rows, region, sectorDef, weight, sortKey, sortDir])

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
      <Card className="flex flex-wrap items-end gap-6">
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
              <option key={r} value={r}>{r}</option>
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
              <option key={s.key} value={s.key}>{s.label}</option>
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
                <tr key={r.la_name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    <span className="mr-2 text-xs text-slate-400">{i + 1}</span>
                    {r.la_name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">{r.region}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{r.population.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {r.sectorEst.toLocaleString()}
                    {' '}
                    <span
                      className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] ${
                        r.is_exact ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'
                      }`}
                    >
                      {r.is_exact ? 'exact' : 'sample'}
                    </span>{' '}
                    ({r.sectorPer10k.toFixed(2)}/10k)
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{r.food_per_10k.toFixed(1)}</td>
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
                      onClick={() => setOpenDetails(openDetails === r.la_name ? null : r.la_name)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {openDetails === r.la_name ? 'Hide details' : 'View details'}
                    </button>
                  </td>
                </tr>
                {openDetails === r.la_name && (
                  <tr key={`${r.la_name}-details`} className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={7} className="px-4 py-4 text-sm text-slate-700">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Where this came from
                          </div>
                          <p className="mt-1">{r.method_notes}</p>
                          {r.source_url && (
                            <p className="mt-2">
                              Source file:{' '}
                              <a
                                href={r.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all text-brand-600 hover:underline"
                              >
                                {r.source_url}
                              </a>
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            Fetched {r.fetch_date ?? 'unknown date'}
                            {!r.is_exact && r.sample_size != null && r.scale_factor != null && (
                              <>
                                {' '}· read {r.sample_size.toLocaleString()} records, scaled ×
                                {Number(r.scale_factor).toFixed(2)} to estimate the area total
                              </>
                            )}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Population
                          </div>
                          <p className="mt-1 tabular-nums">{r.population.toLocaleString()}</p>
                          <p className="mt-1 text-xs text-slate-500">{r.population_source}</p>
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
