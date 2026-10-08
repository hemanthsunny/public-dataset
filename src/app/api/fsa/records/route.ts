import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

// Proxies + parses a single local authority's FSA food hygiene rating
// register (XML, Open Government Licence) into plain JSON rows for the
// acquisition finder's "View details" table.
//
// Only ratings.food.gov.uk URLs are allowed through (SSRF guard) and the
// response is capped to MAX_RECORDS rows — these registers can run into
// the thousands of entries, and this endpoint is for a quick on-page
// preview, not a full export.

export const revalidate = 86400 // cache each LA's parsed file for a day

const ALLOWED_HOST = 'ratings.food.gov.uk'
const MAX_RECORDS = 200

interface RawEstablishment {
  BusinessName?: string
  BusinessType?: string
  AddressLine1?: string
  AddressLine2?: string
  AddressLine3?: string
  AddressLine4?: string
  PostCode?: string
  RatingValue?: string
  RatingDate?: string
}

export async function GET(req: NextRequest) {
  const sourceUrl = req.nextUrl.searchParams.get('url')
  if (!sourceUrl) {
    return NextResponse.json({ error: 'Missing "url" query parameter.' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(sourceUrl)
  } catch {
    return NextResponse.json({ error: 'That is not a valid URL.' }, { status: 400 })
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== ALLOWED_HOST) {
    return NextResponse.json(
      { error: `Only https://${ALLOWED_HOST} source files can be previewed here.` },
      { status: 400 }
    )
  }

  let xml: string
  try {
    const upstream = await fetch(parsedUrl.toString(), {
      headers: { Accept: 'application/xml, text/xml' },
      next: { revalidate },
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `The FSA register responded with ${upstream.status}.` },
        { status: 502 }
      )
    }
    xml = await upstream.text()
  } catch {
    return NextResponse.json({ error: 'Could not reach the FSA open data service.' }, { status: 502 })
  }

  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true })
  let doc: {
    FHRSEstablishment?: {
      Header?: { ItemCount?: number | string }
      EstablishmentCollection?: { EstablishmentDetail?: RawEstablishment | RawEstablishment[] }
    }
  }
  try {
    doc = parser.parse(xml)
  } catch {
    return NextResponse.json({ error: 'Could not parse the FSA register file.' }, { status: 502 })
  }

  const root = doc?.FHRSEstablishment
  const itemCount = root?.Header?.ItemCount != null ? Number(root.Header.ItemCount) : null

  const rawList = root?.EstablishmentCollection?.EstablishmentDetail
  const establishments: RawEstablishment[] = Array.isArray(rawList) ? rawList : rawList ? [rawList] : []

  const records = establishments.slice(0, MAX_RECORDS).map((e) => ({
    name: e.BusinessName || 'Unnamed business',
    type: e.BusinessType || 'Unknown',
    rating: e.RatingValue ?? null,
    ratingDate: e.RatingDate ?? null,
    postcode: e.PostCode ?? null,
    address: [e.AddressLine1, e.AddressLine2, e.AddressLine3, e.AddressLine4].filter(Boolean).join(', '),
  }))

  return NextResponse.json({
    itemCount,
    totalInFile: establishments.length,
    returned: records.length,
    records,
  })
}
