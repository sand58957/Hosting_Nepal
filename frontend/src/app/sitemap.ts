import type { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/home`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/articles`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ]

  try {
    // First page to get totalPages
    const firstRes = await fetch(`${API_URL}/blog/posts?limit=50&page=1`, { next: { revalidate: 300 } })
    const firstJson = await firstRes.json()
    const allPosts: any[] = firstJson?.data?.data || []
    const totalPages = Math.min(firstJson?.data?.meta?.totalPages || 1, 20)

    // Fetch remaining pages in parallel
    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          fetch(`${API_URL}/blog/posts?limit=50&page=${i + 2}`, { next: { revalidate: 300 } }).then(r => r.json())
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

    return [...staticPages, ...blogPages]
  } catch {
    return staticPages
  }
}
