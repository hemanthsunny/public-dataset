import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up — start UK Companies House & public register alerts',
  description:
    'Create a Public Data Agents account to subscribe to Companies House new incorporation alerts and other UK public-register agents.',
  keywords: [
    'sign up Companies House alerts',
    'UK business lead alerts',
    'public data agents signup',
  ],
  robots: { index: true, follow: true },
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children
}
