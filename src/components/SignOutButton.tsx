'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { isDemoMode } from '@/lib/demo'

export function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    setIsLoading(true)
    try {
      if (isDemoMode()) {
        await fetch('/api/demo/logout', { method: 'POST' })
      } else {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.auth.signOut()
      }
    } finally {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="text-slate-600 hover:text-slate-900 disabled:opacity-60"
    >
      {isLoading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
