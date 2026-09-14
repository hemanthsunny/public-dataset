import { NextResponse } from 'next/server'

// Cheap liveness check for uptime monitors — deliberately does not touch
// Supabase, so it can't be used to fingerprint database health.
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
