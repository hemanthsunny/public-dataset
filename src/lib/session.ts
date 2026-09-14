import { cookies } from 'next/headers'
import {
  DEMO_COOKIE,
  DEMO_SESSION_VALUE,
  DEMO_USER,
  isDemoMode,
  isSupabaseConfigured,
} from '@/lib/demo'

export type SessionUser = {
  id: string
  email: string
  fullName: string | null
}

/**
 * Current signed-in user for Server Components. Uses the demo cookie when
 * the app is in demo mode; otherwise reads the Supabase auth session.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const cookieStore = await cookies()
    if (cookieStore.get(DEMO_COOKIE)?.value === DEMO_SESSION_VALUE) {
      return {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        fullName: DEMO_USER.fullName,
      }
    }
    return null
  }

  if (!isSupabaseConfigured()) return null

  const { createClient } = await import('@/lib/supabase/server')
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    return {
      id: user.id,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    }
  } catch {
    return null
  }
}

export async function hasDemoSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(DEMO_COOKIE)?.value === DEMO_SESSION_VALUE
}
