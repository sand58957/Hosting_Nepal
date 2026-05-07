import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that are pure marketing / public content. Safe to cache HTML at edge.
// Anything not listed here keeps Next.js's default `no-store` (e.g. dashboard,
// authenticated pages, API routes, login).
const PUBLIC_PATHS = [
  '/home',
  '/articles',
  '/authors',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/hosting/plans',
  '/vps/order',
  '/vps/vds/order',
  '/vps/dedicated/order',
  '/domains/search',
  '/ssl',
  '/email',
]

const PUBLIC_PREFIXES = ['/articles/', '/authors/']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true

  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isPublicPath(pathname)) return NextResponse.next()

  const response = NextResponse.next()

  // s-maxage: CDN edge keeps for 5 min
  // stale-while-revalidate: serve stale up to 1h while fetching fresh in background
  // Browser still revalidates on each visit (max-age=0) — only the edge caches
  response.headers.set(
    'Cache-Control',
    'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
  )

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
