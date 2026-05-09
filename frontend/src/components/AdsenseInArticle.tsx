'use client'

import { useEffect } from 'react'

// In-article responsive ad unit. Renders nothing until the AdSense ad slot
// ID is provided via NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT, so this component is
// safe to ship before the slot exists in AdSense.
//
// Requires the AdSense loader (adsbygoogle.js) to be present — that is
// injected on public routes by AdsenseAutoAds in the root layout.

const ADSENSE_CLIENT = 'ca-pub-7636052892520336'
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function AdsenseInArticle() {
  useEffect(() => {
    if (!SLOT) return

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // AdSense queues calls before the loader is ready; failures here
      // are non-fatal and recoverable on subsequent renders.
    }
  }, [])

  if (!SLOT) return null

  return (
    <ins
      className='adsbygoogle'
      style={{ display: 'block', textAlign: 'center' }}
      data-ad-layout='in-article'
      data-ad-format='fluid'
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={SLOT}
    />
  )
}
