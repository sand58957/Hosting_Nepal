import type { Metadata } from 'next'

import PublicBlogPost from './PublicBlogPost'

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

interface Props { params: Promise<{ id: string }> }

async function fetchPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/posts/${slug}`, { next: { revalidate: 60 } })
    const json = await res.json()

    return json?.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).id
  const post = await fetchPost(slug)

  if (!post) return { title: 'Post Not Found | Hosting Nepal' }

  const canonicalUrl = `${SITE_URL}/articles/${post.slug}`
  const ogImage = post.ogImage || post.featuredImage

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || '',
    keywords: post.seoKeywords || undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || '',
      type: 'article',
      url: canonicalUrl,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author?.name],
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || '',
      images: ogImage ? [ogImage] : [],
    },
  }
}

const BlogPostPage = async ({ params }: Props) => {
  const slug = (await params).id
  const post = await fetchPost(slug)

  const canonicalUrl = `${SITE_URL}/articles/${post?.slug || slug}`

  const breadcrumbSchema = post && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/articles` },
      ...(post.category ? [{ '@type': 'ListItem', position: 3, name: post.category.name, item: `${SITE_URL}/articles?category=${post.category.slug}` }] : []),
      { '@type': 'ListItem', position: post.category ? 4 : 3, name: post.title, item: canonicalUrl },
    ],
  }

  const articleSchema = post && {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    headline: post.title,
    description: post.seoDescription || post.excerpt || '',
    image: post.ogImage || post.featuredImage ? [post.ogImage || post.featuredImage] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Person', name: post.author?.name || 'Hosting Nepal Team' },
    publisher: {
      '@type': 'Organization',
      name: 'Hosting Nepal',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    articleSection: post.category?.name,
    keywords: post.seoKeywords || undefined,
    wordCount: post.content ? post.content.split(/\s+/).length : undefined,
    inLanguage: 'en',
  }

  return (
    <>
      {breadcrumbSchema && (
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      )}
      {articleSchema && (
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      )}
      <PublicBlogPost slug={slug} />
    </>
  )
}

export default BlogPostPage
