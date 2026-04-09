import type { Metadata } from 'next'

import PublicBlogList from './PublicBlogList'

export const metadata: Metadata = {
  title: 'Blog | Hosting Nepal',
  description: 'Read the latest articles about web hosting, domains, VPS, WordPress, and technology in Nepal.',
  openGraph: {
    title: 'Blog | Hosting Nepal',
    description: 'Latest articles on web hosting and technology.',
    type: 'website',
  },
}

const PublicBlogPage = () => {
  return <PublicBlogList />
}

export default PublicBlogPage
