import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Public Data Agents — UK Companies House & public register alerts',
    template: '%s · Public Data Agents',
  },
  description:
    'Real-time and daily UK public-register alerts from Companies House, FSA hygiene ratings, planning, and court data — delivered to Slack, Teams, WhatsApp, or email.',
  keywords: [
    'Companies House alerts',
    'new company incorporations UK',
    'Companies House API',
    'UK public data agents',
    'FSA hygiene rating alerts',
    'Slack company alerts',
    'new business leads UK',
    'dissolution strike-off alerts',
    'public register monitoring',
  ],
  authors: [{ name: 'Public Data Agents' }],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: siteUrl,
    siteName: 'Public Data Agents',
    title: 'Public Data Agents — UK public register alerts',
    description:
      'Companies House new incorporations and other UK public-register alerts, delivered where you already work.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Public Data Agents — UK public register alerts',
    description:
      'Companies House and UK public-register alerts delivered to Slack, Teams, WhatsApp, or email.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
