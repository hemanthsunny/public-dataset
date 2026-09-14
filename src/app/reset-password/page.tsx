'use client'

import { createClient } from '@/lib/supabase/client'
import { requestPasswordResetSchema } from '@/lib/validation'
import { AuthForm } from '@/components/AuthForm'

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter your email and we'll send you a link to set a new password.
      </p>

      <div className="mt-8">
        <AuthForm
          schema={requestPasswordResetSchema}
          submitLabel="Send reset link"
          fields={[{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }]}
          onSubmit={async ({ email }) => {
            const supabase = createClient()
            await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
            })

            // Always show the same message, whether or not the email exists,
            // so this endpoint can't be used to enumerate registered users.
            return {
              message:
                "If an account exists for that email, we've sent a password reset link.",
            }
          }}
        />
      </div>
    </div>
  )
}
