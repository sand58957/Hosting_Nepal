import type { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hostingnepals.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/home`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]

  try {
    // Fetch all posts by paginating
    const allPosts: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const res = await fetch(`${API_URL}/blog/posts?limit=50&page=${page}`, { next: { revalidate: 300 } })
      const json = await res.json()
      const posts = json?.data?.data || []
      const meta = json?.data?.meta

      allPosts.push(...posts)

      if (!meta || page >= (meta.totalPages || 1)) {
        hasMore = false
      }

      page++

      // Safety limit
      if (page > 20) break
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
