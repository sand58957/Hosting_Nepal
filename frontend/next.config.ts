import { fileURLToPath } from 'url'
import { dirname } from 'path'

import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const __dirname_resolved = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  output: 'standalone',
  outputFileTracingRoot: __dirname_resolved,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true,
        locale: false
      }
    ]
  }
}

// Wrap with Sentry/GlitchTip. Self-hosted GlitchTip has no source-map upload
// service, so disable uploads (no auth token needed) — error capture still works.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  sourcemaps: { disable: true },
  disableLogger: true,
})
