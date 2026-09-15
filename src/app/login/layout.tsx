import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in — UK public data alert account',
  description:
    'Log in to Public Data Agents to manage Companies House incorporation alerts, delivery channels, and filters.',
  keywords: ['login', 'Companies House alerts login', 'public data agents account'],
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
