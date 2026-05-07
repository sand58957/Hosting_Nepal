import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Privacy Policy | Hosting Nepal',
  description: 'How Hosting Nepal collects, uses, stores, and protects your personal data — billing details, account information, and payment data handled under Nepal data-protection norms.',
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: 'Privacy Policy | Hosting Nepal',
    description: 'How Hosting Nepal handles personal data, billing details, and payment information for customers in Nepal.',
    url: `${SITE_URL}/privacy`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Hosting Nepal',
    description: 'How Hosting Nepal handles personal data and billing information.',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
