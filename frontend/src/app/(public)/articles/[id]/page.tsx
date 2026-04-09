import type { Metadata } from 'next'

import PublicBlogPost from './PublicBlogPost'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).id

  try {
    const res = await fetch(`${API_URL}/blog/posts/${slug}`, { next: { revalidate: 60 } })
    const json = await res.json()
    const post = json?.data

    if (!post) return { title: 'Post Not Found | Hosting Nepal' }

    return {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || '',
      keywords: post.seoKeywords || undefined,
      openGraph: {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || '',
        type: 'article',
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        authors: [post.author?.name],
        images: post.ogImage || post.featuredImage ? [{ url: post.ogImage || post.featuredImage }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || '',
        images: post.ogImage || post.featuredImage ? [post.ogImage || post.featuredImage] : [],
      },
    }
  } catch {
    return { title: 'Blog | Hosting Nepal' }
  }
}

const BlogPostPage = async ({ params }: Props) => {
  const slug = (await params).id

  return <PublicBlogPost slug={slug} />
}

export default BlogPostPage
