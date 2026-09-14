'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema } from '@/lib/validation'
import { AuthForm } from '@/components/AuthForm'

export default function SignUpPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Already have one?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>

      <div className="mt-8">
        <AuthForm
          schema={signUpSchema}
          submitLabel="Create account"
          fields={[
            { name: 'fullName', label: 'Full name', type: 'text', autoComplete: 'name' },
            { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              autoComplete: 'new-password',
              hint: 'At least 10 characters, with an uppercase letter, a lowercase letter, and a number.',
            },
          ]}
          onSubmit={async ({ fullName, email, password }) => {
            const supabase = createClient()
            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: fullName },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
              },
            })

            if (error) {
              return { error: error.message }
            }

            router.push('/signup/check-email')
            return {}
          }}
        />
      </div>
    </div>
  )
}
