'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updatePasswordSchema } from '@/lib/validation'
import { AuthForm } from '@/components/AuthForm'

export default function UpdatePasswordPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>

      <div className="mt-8">
        <AuthForm
          schema={updatePasswordSchema}
          submitLabel="Update password"
          fields={[
            {
              name: 'password',
              label: 'New password',
              type: 'password',
              autoComplete: 'new-password',
              hint: 'At least 10 characters, with an uppercase letter, a lowercase letter, and a number.',
            },
          ]}
          onSubmit={async ({ password }) => {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password })

            if (error) return { error: error.message }

            router.push('/dashboard')
            return {}
          }}
        />
      </div>
    </div>
  )
}
