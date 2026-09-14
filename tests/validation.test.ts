import { describe, expect, it } from 'vitest'
import { passwordSchema, deliveryChannelSchema, subscriptionFiltersSchema } from '@/lib/validation'

describe('passwordSchema', () => {
  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('Ab1').success).toBe(false)
  })

  it('rejects passwords missing a required character class', () => {
    expect(passwordSchema.safeParse('alllowercase1').success).toBe(false)
    expect(passwordSchema.safeParse('ALLUPPERCASE1').success).toBe(false)
    expect(passwordSchema.safeParse('NoNumbersHere').success).toBe(false)
  })

  it('accepts a compliant password', () => {
    expect(passwordSchema.safeParse('GoodPassw0rd').success).toBe(true)
  })
})

describe('deliveryChannelSchema', () => {
  it('requires a hooks.slack.com URL for slack channels', () => {
    const result = deliveryChannelSchema.safeParse({
      channelType: 'slack',
      destination: 'https://evil.example.com/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid slack webhook URL', () => {
    const result = deliveryChannelSchema.safeParse({
      channelType: 'slack',
      destination: 'https://hooks.slack.com/services/T000/B000/XXXX',
    })
    expect(result.success).toBe(true)
  })

  it('requires E.164 format for whatsapp numbers', () => {
    expect(
      deliveryChannelSchema.safeParse({ channelType: 'whatsapp', destination: '07700900000' })
        .success
    ).toBe(false)
    expect(
      deliveryChannelSchema.safeParse({ channelType: 'whatsapp', destination: '+447700900000' })
        .success
    ).toBe(true)
  })
})

describe('subscriptionFiltersSchema', () => {
  it('accepts a valid UK postcode area/district', () => {
    expect(subscriptionFiltersSchema.safeParse({ postcodePrefix: 'SW1A' }).success).toBe(true)
  })

  it('rejects an invalid postcode fragment', () => {
    expect(subscriptionFiltersSchema.safeParse({ postcodePrefix: '???' }).success).toBe(false)
  })
})
