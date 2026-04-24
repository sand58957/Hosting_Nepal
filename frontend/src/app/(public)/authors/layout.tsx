import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Authors — Hosting Nepal Editorial Team',
  description: 'Meet the Hosting Nepal editorial team writing hosting, domain, VPS, and security guides for Nepali website owners.',
  alternates: { canonical: `${SITE_URL}/authors` },
  openGraph: {
    title: 'Authors — Hosting Nepal',
    description: 'Hosting Nepal editorial team writing guides for Nepali businesses.',
    url: `${SITE_URL}/authors`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
}

export default function AuthorsLayout({ children }: { children: React.ReactNode }) {
  return children
}
