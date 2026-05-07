import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'WordPress & Web Hosting Plans in Nepal — From NPR 299/mo | Hosting Nepal',
  description: 'Compare managed WordPress and shared hosting plans from NPR 299/month. LiteSpeed web server, CyberPanel, free SSL, NVMe SSD, daily backups, and 24/7 Nepal support. Pay via Khalti, eSewa, or bank transfer.',
  keywords: 'wordpress hosting nepal, web hosting plans nepal, cheap hosting nepal, litespeed hosting nepal, cyberpanel hosting nepal, hosting price nepal NPR',
  alternates: { canonical: `${SITE_URL}/hosting/plans` },
  openGraph: {
    title: 'WordPress & Web Hosting Plans in Nepal — From NPR 299/mo',
    description: 'Managed WordPress hosting with LiteSpeed, CyberPanel, free SSL, NVMe SSD, and 24/7 Nepal-based support.',
    url: `${SITE_URL}/hosting/plans`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WordPress Hosting Plans in Nepal from NPR 299/mo',
    description: 'LiteSpeed, CyberPanel, free SSL, NVMe SSD, Khalti & eSewa accepted.',
  },
}

export default function HostingPlansLayout({ children }: { children: React.ReactNode }) {
  return children
}
