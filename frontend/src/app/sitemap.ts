import type { MetadataRoute } from 'next'

// Use internal Docker URL for server-side fetches (sitemap runs on server, not browser)
const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'
  const now = new Date()

  // All static/public pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/home`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/articles`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/authors`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/hosting/plans`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/vps/order`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/vps/vds/order`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/vps/dedicated/order`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/domains/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/email`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/ssl`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  try {
    // Fetch all blog posts with pagination (no cap)
    const firstRes = await fetch(`${API_URL}/blog/posts?limit=50&page=1`, { cache: 'no-store' })
    const firstJson = await firstRes.json()
    const allPosts: any[] = firstJson?.data?.data || []
    const totalPages = firstJson?.data?.meta?.totalPages || 1

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          fetch(`${API_URL}/blog/posts?limit=50&page=${i + 2}`, { cache: 'no-store' }).then(r => r.json())
        )
      )

      for (const json of remaining) {
        allPosts.push(...(json?.data?.data || []))
      }
    }

    const blogPages: MetadataRoute.Sitemap = allPosts.map((post: any) => ({
      url: `${baseUrl}/articles/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    let authorPages: MetadataRoute.Sitemap = []

    try {
      const authorRes = await fetch(`${API_URL}/blog/authors`, { cache: 'no-store' })
      const authorJson = await authorRes.json()
      const authors: any[] = authorJson?.data || []

      authorPages = authors
        .filter(a => a?.slug)
        .map(a => ({
          url: `${baseUrl}/authors/${a.slug}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        }))
    } catch {}

    return [...staticPages, ...blogPages, ...authorPages]
  } catch {
    return staticPages
  }
}
