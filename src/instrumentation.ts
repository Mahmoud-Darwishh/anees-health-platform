/**
 * Next.js instrumentation hook — runs once when the server process boots.
 *
 * 1. Assert production readiness (fail fast on a misconfigured deploy — e.g. a
 *    `mock_clean` malware scanner or missing secrets — instead of serving PHI).
 * 2. Initialise Sentry server/edge error reporting WHEN a DSN is configured;
 *    inert otherwise. Client init lives in `instrumentation-client.ts`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertProductionReadiness } = await import('@/lib/config/production-readiness');
    assertProductionReadiness();
  }

  const isServerRuntime = process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge';
  if (isServerRuntime) {
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        enabled: process.env.NODE_ENV === 'production',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
      });
    } else if (process.env.NODE_ENV === 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
      // Observability is strongly recommended for a PHI platform, but a missing
      // DSN must NOT block boot (unlike the malware scanner). Warn loudly.
      const { logger } = await import('@/lib/utils/app-logger');
      logger.warn('OBSERVABILITY_NOT_CONFIGURED', {
        message: 'SENTRY_DSN is not set — errors are logged but not reported to Sentry.',
      });
    }
  }
}

/**
 * Server request-error hook (Next.js). Forwards uncaught request errors to
 * Sentry when configured; no-op otherwise.
 */
export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  const Sentry = await import('@sentry/nextjs');
  const capture = (Sentry as unknown as { captureRequestError?: (...a: unknown[]) => void }).captureRequestError;
  if (typeof capture === 'function') {
    capture(...args);
  }
}
