/**
 * Populate la_sector_counts from ONS/Nomis "UK Business Counts" CSV
 * exports -- adds non-food sectors (IT, manufacturing, professional &
 * scientific, construction, ...) that the FSA-sourced
 * la_opportunity_metrics table has no visibility into at all.
 *
 * Setup (one-off, see docs/nomis-sector-data.md for the full walkthrough):
 *   1. cp scripts/nomis-sectors.config.example.json scripts/nomis-sectors.config.json
 *   2. For each sector, build a query on https://www.nomisweb.co.uk/query/select/getdatasetbytheme.asp
 *      (dataset: "UK Business Counts - enterprises", geography: local
 *      authorities, industry: the given SIC 2007 section), then copy the
 *      "API"/CSV query URL it generates into that sector's csvUrl.
 *
 * Usage:
 *   npm run nomis:fetch
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (not the anon key -- this writes data)
 *
 * This script only reaches nomisweb.co.uk and your own Supabase project.
 * It is safe to re-run -- every sector is upserted on (la_name, sector_key).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './load-env'
import type { Database } from '../src/types/database.types'

loadLocalEnv()

interface SectorConfig {
  key: string
  label: string
  sicSection: string
  sicSectionName: string
  csvUrl: string
}

interface Config {
  sectors: SectorConfig[]
}

const SOURCE_LABEL =
  'ONS/Nomis UK Business Counts (enterprises by industry, local authority)'

function loadConfig(): Config {
  const configPath = resolve(process.cwd(), 'scripts/nomis-sectors.config.json')
  if (!existsSync(configPath)) {
    throw new Error(
      'Missing scripts/nomis-sectors.config.json. Copy scripts/nomis-sectors.config.example.json ' +
        "to that path and fill in each sector's csvUrl -- see docs/nomis-sector-data.md."
    )
  }
  const raw = JSON.parse(readFileSync(configPath, 'utf8')) as Config
  const unset = raw.sectors.filter(
    (s) => !s.csvUrl || s.csvUrl.startsWith('REPLACE_WITH')
  )
  if (unset.length) {
    throw new Error(
      `scripts/nomis-sectors.config.json still has placeholder csvUrl values for: ${unset
        .map((s) => s.key)
        .join(', ')}. See docs/nomis-sector-data.md for how to generate each one.`
    )
  }
  return raw
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields with commas (some LA names, e.g. "Kingston upon Hull, City of"). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((v) => v !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  if (rows.length === 0) return []
  const header = (rows[0] ?? []).map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    header.forEach((h, idx) => (obj[h] = (r[idx] ?? '').trim()))
    return obj
  })
}

function findColumn(header: string[], ...candidates: string[]): string | null {
  for (const candidate of candidates) {
    const hit = header.find((h) => h.toUpperCase() === candidate.toUpperCase())
    if (hit) return hit
  }
  // fall back to a loose "contains" match
  for (const candidate of candidates) {
    const hit = header.find((h) => h.toUpperCase().includes(candidate.toUpperCase()))
    if (hit) return hit
  }
  return null
}

async function fetchSectorCounts(sector: SectorConfig): Promise<Map<string, number>> {
  const res = await fetch(sector.csvUrl)
  if (!res.ok) {
    throw new Error(
      `Nomis request for "${sector.key}" failed: HTTP ${res.status} ${res.statusText}`
    )
  }
  const text = await res.text()
  const records = parseCsv(text)
  if (records.length === 0) {
    throw new Error(
      `Nomis response for "${sector.key}" had no data rows -- check the csvUrl in the config.`
    )
  }
  const header = Object.keys(records[0] ?? {})
  const geoCol = findColumn(header, 'GEOGRAPHY_NAME', 'GEOGRAPHY')
  const valueCol = findColumn(header, 'OBS_VALUE', 'VALUE')
  const dateCol = findColumn(header, 'DATE_NAME', 'DATE')
  if (!geoCol || !valueCol) {
    throw new Error(
      `Could not find geography/value columns in the Nomis CSV for "${sector.key}". ` +
        `Columns seen: ${header.join(', ')}`
    )
  }

  // Some queries return multiple time periods -- keep only the latest.
  let latestDate: string | null = null
  if (dateCol) {
    for (const r of records) {
      const d = r[dateCol]
      if (d && (!latestDate || d > latestDate)) latestDate = d
    }
  }

  const counts = new Map<string, number>()
  for (const r of records) {
    if (dateCol && latestDate && r[dateCol] !== latestDate) continue
    const name = r[geoCol]?.trim()
    const value = Number(r[valueCol])
    if (!name || !Number.isFinite(value)) continue
    counts.set(name, value)
  }
  return counts
}

async function main() {
  const missingEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (key) => {
      const value = process.env[key]
      return !value || value.includes('paste-from') || value.includes('your-')
    }
  )
  if (missingEnv.length) {
    console.error('Missing or placeholder env vars:', missingEnv.join(', '))
    console.error('Copy real values into .env.local, then re-run.')
    process.exit(1)
  }

  const config = loadConfig()
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  console.log('Loading local authority populations from la_opportunity_metrics...')
  const { data: laRows, error: laError } = await supabase
    .from('la_opportunity_metrics')
    .select('la_name, population')
  if (laError) throw laError
  const populationByLa = new Map((laRows ?? []).map((r) => [r.la_name, r.population]))
  console.log(`  ${populationByLa.size} local authorities loaded.`)

  const fetchDate = new Date().toISOString().slice(0, 10)
  let totalUpserted = 0

  for (const sector of config.sectors) {
    console.log(
      `\nFetching "${sector.label}" (SIC section ${sector.sicSection}: ${sector.sicSectionName})...`
    )
    const counts = await fetchSectorCounts(sector)
    console.log(`  Nomis returned ${counts.size} geography rows.`)

    const matched: string[] = []
    const unmatchedNomis: string[] = []
    const rowsToUpsert: Database['public']['Tables']['la_sector_counts']['Insert'][] = []

    for (const [nomisLaName, count] of counts) {
      const population = populationByLa.get(nomisLaName)
      if (population === undefined) {
        unmatchedNomis.push(nomisLaName)
        continue
      }
      matched.push(nomisLaName)
      rowsToUpsert.push({
        la_name: nomisLaName,
        sector_key: sector.key,
        sector_label: sector.label,
        count,
        per_10k:
          population > 0 ? Math.round((count / population) * 10000 * 100) / 100 : null,
        is_exact: true,
        source: SOURCE_LABEL,
        source_url: sector.csvUrl,
        fetch_date: fetchDate,
        method_notes: `Enterprise count for SIC 2007 section ${sector.sicSection} (${sector.sicSectionName}), from ${SOURCE_LABEL}.`,
      })
    }

    const unmatchedLa = Array.from(populationByLa.keys()).filter(
      (name) => !counts.has(name)
    )

    if (rowsToUpsert.length) {
      const { error } = await supabase
        .from('la_sector_counts')
        .upsert(rowsToUpsert, { onConflict: 'la_name,sector_key' })
      if (error) throw error
      totalUpserted += rowsToUpsert.length
    }

    console.log(`  Matched ${matched.length} local authorities (upserted).`)
    if (unmatchedNomis.length) {
      console.log(
        `  ${unmatchedNomis.length} Nomis geography names had no match in la_opportunity_metrics ` +
          `(skipped): ${unmatchedNomis.slice(0, 10).join(', ')}${unmatchedNomis.length > 10 ? ', ...' : ''}`
      )
    }
    if (unmatchedLa.length) {
      console.log(
        `  ${unmatchedLa.length} local authorities had no Nomis row for this sector: ` +
          `${unmatchedLa.slice(0, 10).join(', ')}${unmatchedLa.length > 10 ? ', ...' : ''}`
      )
    }
  }

  console.log(
    `\nDone. Upserted ${totalUpserted} (local authority, sector) rows into la_sector_counts.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
