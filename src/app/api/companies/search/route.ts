import { NextResponse } from 'next/server'
import { searchCompanies } from '@/lib/companies-house'
import { getSessionUser } from '@/lib/session'
import { isDemoMode } from '@/lib/demo'

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  if (isDemoMode()) {
    return NextResponse.json({
      results: [
        {
          companyNumber: '14083440',
          companyName: `Demo match for “${q}”`,
          companyStatus: 'active',
          companyType: 'ltd',
          incorporationDate: '2022-05-05',
          addressSnippet: 'Demo Street, London',
        },
      ],
    })
  }

  try {
    const results = await searchCompanies(q, { size: 10 })
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 502 }
    )
  }
}
