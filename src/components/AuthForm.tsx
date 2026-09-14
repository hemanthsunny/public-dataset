'use client'

import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

interface AuthFormProps<T extends z.ZodTypeAny> {
  fields: Array<{ name: string; label: string; type: string; autoComplete?: string; hint?: string }>
  schema: T
  submitLabel: string
  onSubmit: (values: z.infer<T>) => Promise<{ error?: string; message?: string }>
}

/**
 * Generic client-side form: validates with the passed zod schema before
 * ever calling Supabase, shows field-level errors, and surfaces a single
 * top-level result (success message or error) without leaking whether an
 * email address exists in the system.
 */
export function AuthForm<T extends z.ZodTypeAny>({
  fields,
  schema,
  submitLabel,
  onSubmit,
}: AuthFormProps<T>) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFormMessage(null)

    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
    const parsed = schema.safeParse(values)

    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)
    const result = await onSubmit(parsed.data)
    setIsLoading(false)

    if (result.error) setFormError(result.error)
    if (result.message) setFormMessage(result.message)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError && <Alert tone="error">{formError}</Alert>}
      {formMessage && <Alert tone="success">{formMessage}</Alert>}
      {fields.map((field) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          type={field.type}
          autoComplete={field.autoComplete}
          hint={field.hint}
          error={fieldErrors[field.name]}
          required
        />
      ))}
      <Button type="submit" isLoading={isLoading}>
        {submitLabel}
      </Button>
    </form>
  )
}
