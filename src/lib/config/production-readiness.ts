import 'server-only';

import { logger } from '@/lib/utils/app-logger';

/**
 * Production-readiness checks (Phase 9). Fail FAST at boot rather than serve PHI
 * with a stubbed safety control. The headline check: the malware scanner must NOT
 * be `mock_clean` in production (it marks every uploaded file clean). Also asserts
 * the secrets without which the platform cannot operate safely.
 */

export type ReadinessIssue = { key: string; message: string };

export function checkProductionReadiness(env: NodeJS.ProcessEnv = process.env): ReadinessIssue[] {
  if (env.NODE_ENV !== 'production') {
    return [];
  }

  const issues: ReadinessIssue[] = [];

  const scanner = env.EHR_MALWARE_SCAN_BACKEND;
  if (!scanner || scanner === 'mock_clean') {
    issues.push({
      key: 'EHR_MALWARE_SCAN_BACKEND',
      message: 'Malware scanner must be a real backend in production (never mock_clean — it marks every file clean).',
    });
  }
  if (scanner === 'http' && !env.EHR_MALWARE_SCAN_HTTP_URL) {
    issues.push({ key: 'EHR_MALWARE_SCAN_HTTP_URL', message: 'HTTP malware scanner selected but no scanner URL is configured.' });
  }

  for (const key of ['AUTH_SECRET', 'DATABASE_URL', 'MEDPLUM_BASE_URL', 'MEDPLUM_CLIENT_ID', 'MEDPLUM_CLIENT_SECRET']) {
    if (!env[key]) {
      issues.push({ key, message: `Missing required secret: ${key}.` });
    }
  }

  return issues;
}

/**
 * Logs every readiness issue and — when `strict` (default in production) — throws,
 * so a misconfigured deploy fails fast at startup. A no-op outside production.
 */
export function assertProductionReadiness(options?: { strict?: boolean; env?: NodeJS.ProcessEnv }): void {
  const env = options?.env ?? process.env;
  const issues = checkProductionReadiness(env);
  if (issues.length === 0) {
    return;
  }

  for (const issue of issues) {
    logger.error('PRODUCTION_READINESS_FAILED', { key: issue.key, message: issue.message });
  }

  const strict = options?.strict ?? env.NODE_ENV === 'production';
  if (strict) {
    throw new Error(`Production readiness check failed: ${issues.map((i) => i.key).join(', ')}`);
  }
}
