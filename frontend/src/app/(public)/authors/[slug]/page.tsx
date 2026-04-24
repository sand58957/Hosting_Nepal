import type { Metadata } from 'next'

import AuthorProfile from './AuthorProfile'

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

interface Props { params: Promise<{ slug: string }> }

async function fetchAuthor(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/authors/${slug}`, { next: { revalidate: 300 } })
    const json = await res.json()

    return json?.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchAuthor(slug)

  if (!data?.author) return { title: 'Author Not Found | Hosting Nepal' }

  const a = data.author
  const title = `${a.name}${a.title ? ` — ${a.title}` : ''} | Hosting Nepal`
  const description = a.bio || `${a.name} writes hosting, domain, and VPS guides at Hosting Nepal. ${data.totalPosts} published articles.`
  const url = `${SITE_URL}/authors/${a.slug}`

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url,
      type: 'profile',
      siteName: 'Hosting Nepal',
      images: a.avatarUrl ? [{ url: a.avatarUrl }] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description: description.slice(0, 200),
      images: a.avatarUrl ? [a.avatarUrl] : [],
    },
  }
}

const AuthorPage = async ({ params }: Props) => {
  const { slug } = await params
  const data = await fetchAuthor(slug)

  return (
    <>
      {data?.jsonLd && (
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd) }} />
      )}
      <AuthorProfile slug={slug} />
    </>
  )
}

export default AuthorPage
