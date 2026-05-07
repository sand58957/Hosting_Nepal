import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'VPS Hosting in Nepal — From NPR 1,500/mo with Full Root Access | Hosting Nepal',
  description: 'Order VPS hosting in Nepal from NPR 1,500/month. Full root access, NVMe SSD, dedicated CPU/RAM, choice of Linux distros, and instant deployment. Pay via Khalti, eSewa, or bank transfer.',
  keywords: 'VPS hosting nepal, virtual private server nepal, cheap VPS nepal, NVMe VPS nepal, root access VPS nepal, KVM VPS nepal, linux VPS nepal',
  alternates: { canonical: `${SITE_URL}/vps/order` },
  openGraph: {
    title: 'VPS Hosting in Nepal — From NPR 1,500/mo',
    description: 'Full root access VPS with NVMe SSD, dedicated resources, and instant deployment. Pay in NPR via Khalti or eSewa.',
    url: `${SITE_URL}/vps/order`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VPS Hosting in Nepal from NPR 1,500/mo',
    description: 'Full root access, NVMe SSD, dedicated resources, instant deployment.',
  },
}

export default function VpsOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
