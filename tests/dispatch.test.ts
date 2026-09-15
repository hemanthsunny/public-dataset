import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dispatchToChannel,
  sendEmailAlert,
  sendSlackAlert,
  sendTeamsAlert,
  sendWhatsAppAlert,
  type AlertMessage,
} from '@/lib/dispatch'

const ORIGINAL_ENV = { ...process.env }
const message: AlertMessage = { title: 'Test alert', lines: ['line one', 'line two'] }

function response(ok: boolean, status = 200, body = '') {
  return { ok, status, text: async () => body } as Response
}

describe('dispatch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('sendSlackAlert', () => {
    it('posts a JSON payload with a title and bulleted lines', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce(response(true))

      await sendSlackAlert('https://hooks.slack.com/services/x', message)

      const call = fetchMock.mock.calls[0] as [unknown, any]
      const [url, init] = call
      expect(url).toBe('https://hooks.slack.com/services/x')
      const body = JSON.parse(init.body)
      expect(body.text).toBe('Test alert')
      expect(JSON.stringify(body.blocks)).toContain('line one')
    })

    it('throws when the webhook responds with a non-OK status', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce(response(false, 404, 'no_webhook'))

      await expect(sendSlackAlert('https://hooks.slack.com/services/x', message)).rejects.toThrow(
        /404/
      )
    })
  })

  describe('sendTeamsAlert', () => {
    it('posts a MessageCard payload', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce(response(true))

      await sendTeamsAlert('https://outlook.office.com/webhook/x', message)

      const call = fetchMock.mock.calls[0] as [unknown, any]
      const [, init] = call
      const body = JSON.parse(init.body)
      expect(body['@type']).toBe('MessageCard')
      expect(body.title).toBe('Test alert')
    })
  })

  describe('sendEmailAlert', () => {
    it('throws when Resend credentials are not configured', async () => {
      delete process.env.RESEND_API_KEY
      delete process.env.ALERTS_FROM_EMAIL
      await expect(sendEmailAlert('user@example.com', message)).rejects.toThrow(
        /RESEND_API_KEY|ALERTS_FROM_EMAIL/
      )
    })

    it('sends via the Resend API when configured', async () => {
      process.env.RESEND_API_KEY = 'test-resend-key'
      process.env.ALERTS_FROM_EMAIL = 'alerts@example.com'
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce(response(true))

      await sendEmailAlert('user@example.com', message)

      const call = fetchMock.mock.calls[0] as [unknown, any]
      const [url, init] = call
      expect(url).toBe('https://api.resend.com/emails')
      expect(init.headers.Authorization).toBe('Bearer test-resend-key')
      const body = JSON.parse(init.body)
      expect(body.to).toBe('user@example.com')
      expect(body.from).toBe('alerts@example.com')
      expect(body.subject).toBe('Test alert')
    })
  })

  describe('sendWhatsAppAlert', () => {
    it('throws when Twilio credentials are not configured', async () => {
      delete process.env.TWILIO_ACCOUNT_SID
      delete process.env.TWILIO_AUTH_TOKEN
      delete process.env.TWILIO_WHATSAPP_FROM
      await expect(sendWhatsAppAlert('+447700900000', message)).rejects.toThrow(/Twilio/)
    })

    it('posts a form-encoded message via the Twilio API when configured', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACxxxx'
      process.env.TWILIO_AUTH_TOKEN = 'secret'
      process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886'
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce(response(true))

      await sendWhatsAppAlert('+447700900000', message)

      const call = fetchMock.mock.calls[0] as [unknown, any]
      const [url, init] = call
      expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACxxxx/Messages.json')
      const params = new URLSearchParams(init.body)
      expect(params.get('To')).toBe('whatsapp:+447700900000')
      expect(params.get('From')).toBe('whatsapp:+14155238886')
      expect(params.get('Body')).toContain('Test alert')
    })
  })

  describe('dispatchToChannel', () => {
    it('routes each channel_type to its sender', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue(response(true))
      process.env.RESEND_API_KEY = 'k'
      process.env.ALERTS_FROM_EMAIL = 'alerts@example.com'
      process.env.TWILIO_ACCOUNT_SID = 'ACxxxx'
      process.env.TWILIO_AUTH_TOKEN = 'secret'
      process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886'

      await dispatchToChannel(
        { channel_type: 'slack', destination: 'https://hooks.slack.com/services/x' },
        message
      )
      await dispatchToChannel(
        { channel_type: 'teams', destination: 'https://outlook.office.com/webhook/x' },
        message
      )
      await dispatchToChannel({ channel_type: 'email', destination: 'user@example.com' }, message)
      await dispatchToChannel({ channel_type: 'whatsapp', destination: '+447700900000' }, message)

      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it('throws for an unknown channel type', async () => {
      await expect(
        dispatchToChannel({ channel_type: 'carrier-pigeon', destination: 'n/a' }, message)
      ).rejects.toThrow(/Unknown channel type/)
    })
  })
})
