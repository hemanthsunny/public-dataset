import { createClient } from '@/lib/supabase/server'
import { AccountSettingsForm } from './AccountSettingsForm'

export default async function DashboardSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', user?.id ?? '')
    .single()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="mt-6 max-w-lg">
        <AccountSettingsForm
          email={user?.email ?? ''}
          fullName={profile?.full_name ?? ''}
          companyName={profile?.company_name ?? ''}
        />
      </div>
    </div>
  )
}
