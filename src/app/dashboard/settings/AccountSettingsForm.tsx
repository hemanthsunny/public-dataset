'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function AccountSettingsForm({
  email,
  fullName: initialFullName,
  companyName: initialCompanyName,
}: {
  email: string
  fullName: string
  companyName: string
}) {
  const [fullName, setFullName] = useState(initialFullName)
  const [companyName, setCompanyName] = useState(initialCompanyName)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveProfile() {
    setError(null)
    setIsSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, company_name: companyName })
      .eq('id', user.id)

    setIsSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {saved && (
        <div className="mt-3">
          <Alert tone="success">Saved.</Alert>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Email" value={email} disabled readOnly />
        <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field
          label="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Button onClick={saveProfile} isLoading={isSaving} className="self-start">
          Save changes
        </Button>
      </div>
    </Card>
  )
}
