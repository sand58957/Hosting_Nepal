import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isPublicPath } from '@/lib/publicPaths'

// Public paths get edge HTML caching. Anything not in the shared list keeps
// Next.js's default `no-store` (dashboard, authenticated pages, API, auth).

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isPublicPath(pathname)) return NextResponse.next()

  const response = NextResponse.next()

  // s-maxage: CDN edge keeps for 1 min
  // stale-while-revalidate: serve stale up to 5 min while fetching fresh in background
  // — keeps deploys visible within ~6 min instead of up to an hour.
  // Browser still revalidates on each visit (max-age=0) — only the edge caches
  response.headers.set(
    'Cache-Control',
    'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  )

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
