import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'SSL Certificates in Nepal — Free Let\'s Encrypt & Premium SSL | Hosting Nepal',
  description: 'Free Let\'s Encrypt SSL on every Hosting Nepal plan, with premium DV, OV, and EV SSL certificates available for businesses in Nepal. Auto-renewal, CyberPanel integration, and instant issuance.',
  keywords: 'SSL certificate nepal, free SSL nepal, let\'s encrypt nepal, https nepal, premium SSL nepal, EV SSL nepal',
  alternates: { canonical: `${SITE_URL}/ssl` },
  openGraph: {
    title: 'SSL Certificates in Nepal — Free & Premium',
    description: 'Free Let\'s Encrypt SSL on every plan, plus premium DV/OV/EV options for Nepal businesses.',
    url: `${SITE_URL}/ssl`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SSL Certificates in Nepal',
    description: 'Free Let\'s Encrypt + premium DV/OV/EV options. Auto-renewal included.',
  },
}

export default function SslLayout({ children }: { children: React.ReactNode }) {
  return children
}
