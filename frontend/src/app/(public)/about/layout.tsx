import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'About Hosting Nepal — Nepal\'s Premier Web Hosting Company',
  description: 'Learn about Hosting Nepal, founded by Marketminds Investment Group in Kathmandu. We provide NPR-priced WordPress hosting, VPS, domains, and dedicated servers with local Khalti/eSewa payment and 24/7 Nepal support.',
  keywords: 'about hosting nepal, hosting nepal company, marketminds investment group, nepal hosting provider, kathmandu hosting',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About Hosting Nepal — Nepal\'s Premier Web Hosting Company',
    description: 'Nepal-based web hosting company providing domain, WordPress, VPS, and dedicated server hosting with NPR pricing and local payment methods.',
    url: `${SITE_URL}/about`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Hosting Nepal',
    description: 'Nepal\'s premier web hosting platform — NPR pricing, Khalti/eSewa, 24/7 local support.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
