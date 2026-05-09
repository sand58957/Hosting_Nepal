'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

import { isPublicPath } from '@/lib/publicPaths'

const ADSENSE_CLIENT = 'ca-pub-7636052892520336'

// Loads the Google AdSense script only on public marketing pages.
// AdSense ToS forbids ads on auth/dashboard surfaces, so we gate by pathname.

export default function AdsenseAutoAds() {
  const pathname = usePathname()

  if (!pathname || !isPublicPath(pathname)) return null

  return (
    <Script
      id='adsense-auto-ads'
      async
      strategy='afterInteractive'
      crossOrigin='anonymous'
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  )
}
