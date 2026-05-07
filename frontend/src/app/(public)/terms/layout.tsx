import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Terms of Service | Hosting Nepal',
  description: 'Hosting Nepal Terms of Service — acceptable use, billing, refund policy, SLA, and customer responsibilities for hosting, domain, VPS, and dedicated server services.',
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: 'Terms of Service | Hosting Nepal',
    description: 'Acceptable use, billing, SLA, and refund policy for Hosting Nepal services.',
    url: `${SITE_URL}/terms`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | Hosting Nepal',
    description: 'Hosting Nepal acceptable-use policy, billing, refund, and SLA terms.',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
