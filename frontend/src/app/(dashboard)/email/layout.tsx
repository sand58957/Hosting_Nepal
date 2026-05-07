import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Business Email Hosting in Nepal — Google Workspace, Titan & Custom Email | Hosting Nepal',
  description: 'Professional business email hosting in Nepal with your own domain. Google Workspace, Titan Email, and custom mail server options for teams of any size. NPR pricing, Khalti & eSewa accepted.',
  keywords: 'business email nepal, email hosting nepal, google workspace nepal, titan email nepal, custom email nepal, professional email nepal',
  alternates: { canonical: `${SITE_URL}/email` },
  openGraph: {
    title: 'Business Email Hosting in Nepal',
    description: 'Google Workspace, Titan, and custom email solutions for Nepali businesses.',
    url: `${SITE_URL}/email`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Email Hosting in Nepal',
    description: 'Google Workspace, Titan Email, and custom email solutions.',
  },
}

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return children
}
