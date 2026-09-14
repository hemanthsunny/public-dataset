import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  DEMO_COOKIE,
  DEMO_SESSION_VALUE,
  isDemoMode,
  isSupabaseConfigured,
} from '@/lib/demo'

const PROTECTED_PREFIXES = ['/dashboard']

/**
 * Refreshes the auth session on every request and redirects
 * unauthenticated users away from protected routes. Called from
 * middleware.ts at the project root.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  )

  if (isDemoMode()) {
    const hasDemo =
      request.cookies.get(DEMO_COOKIE)?.value === DEMO_SESSION_VALUE
    if (isProtected && !hasDemo) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  if (!isSupabaseConfigured()) {
    if (isProtected) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
