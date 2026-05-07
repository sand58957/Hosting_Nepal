import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hostingnepals.com'

export const metadata: Metadata = {
  title: 'VDS Hosting in Nepal — Virtual Dedicated Servers with Guaranteed Resources | Hosting Nepal',
  description: 'Order Virtual Dedicated Server (VDS) hosting in Nepal with physically dedicated CPU cores and RAM. Enterprise-grade performance without the dedicated server price. NPR billing, Khalti & eSewa accepted.',
  keywords: 'VDS hosting nepal, virtual dedicated server nepal, dedicated CPU VPS nepal, dedicated cores nepal, enterprise VPS nepal',
  alternates: { canonical: `${SITE_URL}/vps/vds/order` },
  openGraph: {
    title: 'VDS Hosting in Nepal — Dedicated CPU & RAM',
    description: 'Virtual Dedicated Servers with physically dedicated CPU cores and RAM. NPR pricing.',
    url: `${SITE_URL}/vps/vds/order`,
    type: 'website',
    siteName: 'Hosting Nepal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VDS Hosting in Nepal',
    description: 'Dedicated CPU cores and RAM at virtual-server pricing.',
  },
}

export default function VdsOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
