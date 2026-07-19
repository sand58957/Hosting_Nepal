// Sentry/GlitchTip — browser/client init. Next.js loads this automatically.
// No-ops when NEXT_PUBLIC_SENTRY_DSN is unset (the DSN is baked in at build time).
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
  tracesSampleRate: 0,
  // Session Replay is a Sentry SaaS feature, not supported by GlitchTip — keep off.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
