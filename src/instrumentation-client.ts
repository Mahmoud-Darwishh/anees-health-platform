/**
 * Client-side Sentry init. Runs once on client startup. Gated on a public DSN
 * configured at BUILD time — the dynamic import is dead-code-eliminated (and the
 * SDK kept out of the bundle entirely) when `NEXT_PUBLIC_SENTRY_DSN` is unset.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === 'production',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
}
