/**
 * Next.js instrumentation hook — runs once when the server process boots.
 *
 * Phase 9: assert production readiness at startup so a misconfigured deploy
 * (e.g. a `mock_clean` malware scanner, or missing Medplum/auth secrets) fails
 * fast instead of quietly serving PHI. No-op outside production / the Node
 * runtime. This is also the natural place to initialise an error-reporting SDK
 * (e.g. Sentry) when one is added — see `@/lib/utils/observability`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertProductionReadiness } = await import('@/lib/config/production-readiness');
    assertProductionReadiness();
  }
}
