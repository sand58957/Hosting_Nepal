// Routes that are pure marketing / public content.
// Used by:
//   - middleware.ts to enable edge caching
//   - AdsenseAutoAds.tsx to gate ad-loader injection (AdSense policy
//     forbids ads on auth/dashboard pages)

export const PUBLIC_PATHS: string[] = [
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

export const PUBLIC_PREFIXES: string[] = ['/articles/', '/authors/']

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true

  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}
