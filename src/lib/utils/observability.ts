import { logger } from '@/lib/utils/app-logger';

/**
 * Error-reporting seam. Always logs through the structured app logger, and —
 * when a Sentry DSN is configured — also forwards to Sentry. The Sentry import
 * is late-bound (dynamic) so the SDK isn't pulled into every bundle and the
 * forward is a no-op when no DSN is set.
 *
 * NEVER put PHI in `context` — only ids, routes, and non-clinical metadata.
 */
const SENTRY_ENABLED = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error('UNHANDLED_ERROR', { message, stack, ...context });

  if (SENTRY_ENABLED) {
    void import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(error instanceof Error ? error : new Error(message), { extra: context });
      })
      .catch(() => {
        // SDK unavailable — the structured log above is the fallback record.
      });
  }
}
