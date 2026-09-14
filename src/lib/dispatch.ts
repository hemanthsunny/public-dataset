/**
 * Outbound alert dispatch — one function per channel type. Each function
 * is deliberately narrow (single responsibility) so the pipeline that
 * calls them (netlify/functions/agent1-new-incorporations.ts) stays
 * readable and each transport can be tested in isolation.
 */

export interface AlertMessage {
  title: string
  lines: string[]
  url?: string
}

function formatPlainText(message: AlertMessage): string {
  return [message.title, ...message.lines].join('\n')
}

export async function sendSlackAlert(webhookUrl: string, message: AlertMessage): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message.title,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*${message.title}*` } },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: message.lines.map((l) => `• ${l}`).join('\n') },
        },
      ],
    }),
  })
  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status} ${await response.text()}`)
  }
}

export async function sendTeamsAlert(webhookUrl: string, message: AlertMessage): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: message.title,
      title: message.title,
      text: message.lines.join('\n\n'),
    }),
  })
  if (!response.ok) {
    throw new Error(`Teams webhook failed: ${response.status} ${await response.text()}`)
  }
}

export async function sendEmailAlert(toEmail: string, message: AlertMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ALERTS_FROM_EMAIL
  if (!apiKey || !from) {
    throw new Error('Missing RESEND_API_KEY or ALERTS_FROM_EMAIL for email delivery.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: toEmail,
      subject: message.title,
      text: formatPlainText(message),
    }),
  })
  if (!response.ok) {
    throw new Error(`Email send failed: ${response.status} ${await response.text()}`)
  }
}

export async function sendWhatsAppAlert(toPhoneE164: string, message: AlertMessage): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!accountSid || !authToken || !from) {
    throw new Error('Missing Twilio credentials for WhatsApp delivery.')
  }

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${toPhoneE164}`,
    Body: formatPlainText(message),
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  )
  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${response.status} ${await response.text()}`)
  }
}

export async function dispatchToChannel(
  channel: { channel_type: string; destination: string },
  message: AlertMessage
): Promise<void> {
  switch (channel.channel_type) {
    case 'slack':
      return sendSlackAlert(channel.destination, message)
    case 'teams':
      return sendTeamsAlert(channel.destination, message)
    case 'email':
      return sendEmailAlert(channel.destination, message)
    case 'whatsapp':
      return sendWhatsAppAlert(channel.destination, message)
    default:
      throw new Error(`Unknown channel type: ${channel.channel_type}`)
  }
}
