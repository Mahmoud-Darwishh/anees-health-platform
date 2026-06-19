import { logger } from '@/lib/utils/app-logger';

/**
 * Error-reporting seam (Phase 9). The single place to forward an unexpected error
 * to an external sink. Sentry is the planned vendor and the CSP already allows
 * `*.sentry.io` / `*.ingest.sentry.io` — installing `@sentry/nextjs`, initialising
 * it in `instrumentation.ts`, and calling `Sentry.captureException(error, …)` here
 * lights it up without touching any call site.
 *
 * Until then this routes through the structured app logger. NEVER put PHI in
 * `context` — only ids, routes, and non-clinical metadata.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error('UNHANDLED_ERROR', { message, stack, ...context });
  // TODO(observability): Sentry.captureException(error, { extra: context });
}
