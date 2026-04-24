import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Contact Hosting Nepal — 24/7 Support | Kathmandu, Nepal',
  description: 'Contact Hosting Nepal for sales and technical support. Call +977-9802348957, email admin@hostingnepals.com, or visit our Koteshwor, Kathmandu office. 24/7 support in English and Nepali.',
  keywords: 'contact hosting nepal, hosting nepal support, hosting nepal phone, hosting nepal email, kathmandu hosting support',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'Contact Hosting Nepal — 24/7 Nepal-Based Support',
    description: 'Get in touch with Hosting Nepal. Phone, email, and office in Koteshwor, Kathmandu. Support in English and Nepali.',
    url: `${SITE_URL}/contact`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Hosting Nepal',
    description: '24/7 Nepal-based hosting support in English and Nepali.',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
