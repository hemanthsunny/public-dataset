'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DEMO_CREDENTIALS, isDemoMode } from '@/lib/demo'
import { loginSchema } from '@/lib/validation'
import { AuthForm } from '@/components/AuthForm'
import { Alert } from '@/components/ui/Alert'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const demo = isDemoMode()

  return (
    <AuthForm
      schema={loginSchema}
      submitLabel="Log in"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
      ]}
      onSubmit={async ({ email, password }) => {
        if (demo) {
          const res = await fetch('/api/demo/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) {
            return { error: 'Incorrect email or password.' }
          }
          router.push(next)
          router.refresh()
          return {}
        }

        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          return { error: 'Incorrect email or password.' }
        }

        router.push(next)
        router.refresh()
        return {}
      }}
    />
  )
}

export default function LoginPage() {
  const demo = isDemoMode()

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">
        New here?{' '}
        <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>

      {demo && (
        <div className="mt-6">
          <Alert tone="info">
            <p className="font-medium">Demo mode — use these credentials:</p>
            <p className="mt-1 font-mono text-sm">
              {DEMO_CREDENTIALS.email}
              <br />
              {DEMO_CREDENTIALS.password}
            </p>
          </Alert>
        </div>
      )}

      <div className="mt-8">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      {!demo && (
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/reset-password" className="font-medium text-brand-600 hover:text-brand-700">
            Forgot your password?
          </Link>
        </p>
      )}
    </div>
  )
}
