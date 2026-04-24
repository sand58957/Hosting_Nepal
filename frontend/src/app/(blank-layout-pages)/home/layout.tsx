import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Hosting Nepal — Best Web Hosting, Domain & VPS in Nepal 2026',
  description: 'Nepal\'s #1 web hosting platform. WordPress hosting from NPR 299/mo, VPS from NPR 1,500/mo, domains from NPR 1,200/yr. Free SSL, LiteSpeed, NVMe SSD. Pay via Khalti, eSewa & bank transfer. 24/7 Nepal support.',
  keywords: 'web hosting nepal, domain registration nepal, VPS hosting nepal, dedicated server nepal, wordpress hosting nepal, cheap hosting nepal, .np domain, eSewa hosting, Khalti hosting, best hosting nepal 2026',
  alternates: { canonical: `${SITE_URL}/home` },
  openGraph: {
    title: 'Hosting Nepal — Best Web Hosting & Domain Registration in Nepal',
    description: 'Domain, WordPress, VPS & Dedicated Server hosting in Nepal with NPR pricing, Khalti/eSewa payment, free SSL, LiteSpeed, and 24/7 Nepal-based support.',
    url: `${SITE_URL}/home`,
    type: 'website',
    siteName: 'Hosting Nepal',
    countryName: 'Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hosting Nepal — Best Web Hosting in Nepal 2026',
    description: 'WordPress hosting from NPR 299/mo, VPS from NPR 1,500/mo. Free SSL, NVMe SSD. Pay via Khalti & eSewa. 24/7 Nepal support.',
  },
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children
}
