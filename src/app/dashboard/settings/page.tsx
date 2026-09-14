import { createClient } from '@/lib/supabase/server'
import { AccountSettingsForm } from './AccountSettingsForm'
import { DEMO_USER, isDemoMode } from '@/lib/demo'
import { getSessionUser } from '@/lib/session'

export default async function DashboardSettingsPage() {
  const user = await getSessionUser()
  let fullName = DEMO_USER.fullName
  let companyName = DEMO_USER.companyName
  const email = user?.email ?? DEMO_USER.email

  if (!isDemoMode()) {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user?.id ?? '')
      .single()

    fullName = profile?.full_name ?? ''
    companyName = profile?.company_name ?? ''
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="mt-6 max-w-lg">
        <AccountSettingsForm
          email={email}
          fullName={fullName}
          companyName={companyName}
          demoMode={isDemoMode()}
        />
      </div>
    </div>
  )
}
