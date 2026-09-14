import { z } from 'zod'

// Shared input-validation schemas. Every form and API route parses
// untrusted input through one of these before it touches the database —
// the app-layer half of defence-in-depth (RLS is the data-layer half).

export const emailSchema = z.string().trim().email('Enter a valid email address').max(255)

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128)
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number')

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name').max(120),
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(128),
})

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  password: passwordSchema,
})

const ukPostcodeRegex =
  /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/

export const subscriptionFiltersSchema = z.object({
  postcodePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .max(8)
    .optional()
    .refine(
      (v) => !v || /^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(v),
      'Enter a postcode area or district, e.g. "M1" or "SW1A"'
    ),
  sicCodes: z.array(z.string().trim().regex(/^[0-9]{4,5}$/)).max(20).optional(),
  region: z.string().trim().max(100).optional(),
})

export const deliveryChannelSchema = z.discriminatedUnion('channelType', [
  z.object({
    channelType: z.literal('slack'),
    label: z.string().trim().max(80).optional(),
    destination: z
      .string()
      .url('Enter a valid Slack incoming webhook URL')
      .refine((v) => v.startsWith('https://hooks.slack.com/'), {
        message: 'Must be a hooks.slack.com incoming webhook URL',
      }),
  }),
  z.object({
    channelType: z.literal('teams'),
    label: z.string().trim().max(80).optional(),
    destination: z.string().url('Enter a valid Teams incoming webhook URL'),
  }),
  z.object({
    channelType: z.literal('whatsapp'),
    label: z.string().trim().max(80).optional(),
    destination: z
      .string()
      .trim()
      .regex(/^\+[1-9][0-9]{7,14}$/, 'Enter a phone number in E.164 format, e.g. +447700900000'),
  }),
  z.object({
    channelType: z.literal('email'),
    label: z.string().trim().max(80).optional(),
    destination: emailSchema,
  }),
])

export { ukPostcodeRegex }
