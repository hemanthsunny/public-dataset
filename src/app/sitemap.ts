import type { MetadataRoute } from 'next'
import { AGENTS } from '@/lib/constants/agents'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/agents`, changeFrequency: 'weekly', priority: 0.8 },
    ...AGENTS.map((agent) => ({
      url: `${siteUrl}/agents/${agent.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ]
}
