import * as Sentry from '@sentry/node';

// Sentry / GlitchTip instrumentation.
//
// MUST be the very first import in main.ts so the SDK can patch Node internals
// (http, etc.) before they're used. No-ops when SENTRY_DSN is unset, so local
// and dev runs need no GlitchTip instance. GlitchTip is Sentry-API compatible,
// so the standard @sentry/node SDK talks to it unchanged — point SENTRY_DSN at
// the DSN copied from the GlitchTip "hn-backend" project.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    // Event tracking only by default — keep performance tracing off to stay
    // within GlitchTip's event volume (override via SENTRY_TRACES_SAMPLE_RATE).
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
}

export { Sentry };
