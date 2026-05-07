import type { Metadata } from 'next'

import PublicBlogList from './PublicBlogList'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Hosting Nepal Blog — Hosting, Domain, VPS & WordPress Guides for Nepal',
  description: 'Tutorials, guides, and how-to articles on web hosting, domain registration, VPS, WordPress, SSL, email, and security — written for website owners and developers in Nepal.',
  keywords: 'hosting nepal blog, web hosting guides nepal, wordpress tutorial nepal, VPS guide nepal, domain guide nepal, .np domain guide',
  alternates: { canonical: `${SITE_URL}/articles` },
  openGraph: {
    title: 'Hosting Nepal Blog — Hosting, Domain, VPS & WordPress Guides',
    description: 'Tutorials and guides on web hosting, VPS, domains, SSL, and WordPress for the Nepal market.',
    url: `${SITE_URL}/articles`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hosting Nepal Blog',
    description: 'Hosting, VPS, domain, and WordPress guides written for Nepal.',
  },
}

const PublicBlogPage = () => {
  return <PublicBlogList />
}

export default PublicBlogPage
