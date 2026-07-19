// Sentry/GlitchTip — Node.js server runtime init (SSR, route handlers, server actions).
// Imported by src/instrumentation.ts. No-ops when NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
  // Event tracking only — keep tracing off to respect GlitchTip event volume.
  tracesSampleRate: 0,
})
