import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'Dedicated Server Hosting in Nepal — Intel Xeon Bare Metal from NPR 15,000/mo | Hosting Nepal',
  description: 'Order bare-metal dedicated servers in Nepal with Intel Xeon processors, NVMe SSD, and full hardware control. Maximum performance for mission-critical applications. NPR billing, Khalti, eSewa, bank transfer.',
  keywords: 'dedicated server nepal, bare metal server nepal, intel xeon server nepal, dedicated hosting nepal, enterprise server nepal',
  alternates: { canonical: `${SITE_URL}/vps/dedicated/order` },
  openGraph: {
    title: 'Dedicated Server Hosting in Nepal — From NPR 15,000/mo',
    description: 'Bare-metal Intel Xeon dedicated servers with full hardware control. NPR pricing.',
    url: `${SITE_URL}/vps/dedicated/order`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dedicated Servers in Nepal from NPR 15,000/mo',
    description: 'Intel Xeon bare-metal servers with full hardware control.',
  },
}

export default function DedicatedOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
