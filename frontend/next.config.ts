import { fileURLToPath } from 'url'
import { dirname } from 'path'

import type { NextConfig } from 'next'

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

export default nextConfig
