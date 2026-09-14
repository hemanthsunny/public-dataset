import { NextResponse } from 'next/server'
import {
  DEMO_COOKIE,
  DEMO_CREDENTIALS,
  DEMO_SESSION_VALUE,
  isDemoMode,
} from '@/lib/demo'

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Demo mode is disabled.' }, { status: 403 })
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (
    email !== DEMO_CREDENTIALS.email.toLowerCase() ||
    password !== DEMO_CREDENTIALS.password
  ) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEMO_COOKIE, DEMO_SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
