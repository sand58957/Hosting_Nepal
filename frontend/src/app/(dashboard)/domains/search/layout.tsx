import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Domain Registration in Nepal — Search & Buy .com, .np, .com.np from NPR 1,200/yr | Hosting Nepal',
  description: 'Register .com, .np, .com.np, and 20+ domain extensions in Nepal from NPR 1,200/year. Free WHOIS privacy, instant activation, and integrated DNS management. Pay via Khalti, eSewa, or bank transfer.',
  keywords: 'domain registration nepal, .np domain, .com.np domain, buy domain nepal, cheap domain nepal, register domain nepal NPR',
  alternates: { canonical: `${SITE_URL}/domains/search` },
  openGraph: {
    title: 'Domain Registration in Nepal — From NPR 1,200/yr',
    description: 'Register .com, .np, .com.np with free WHOIS privacy and instant activation.',
    url: `${SITE_URL}/domains/search`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Domain Registration in Nepal',
    description: '.com, .np, .com.np from NPR 1,200/yr with free WHOIS privacy.',
  },
}

export default function DomainsSearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
