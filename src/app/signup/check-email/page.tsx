import { Alert } from '@/components/ui/Alert'

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
      <div className="mt-6">
        <Alert tone="info">
          We&apos;ve sent a confirmation link to your email address. Click it to activate your
          account, then log in.
        </Alert>
      </div>
    </div>
  )
}
