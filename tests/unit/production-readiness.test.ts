import { describe, it, expect } from 'vitest';
import { checkProductionReadiness } from '@/lib/config/production-readiness';

const ok = {
  NODE_ENV: 'production',
  AUTH_SECRET: 'x',
  DATABASE_URL: 'x',
  MEDPLUM_BASE_URL: 'x',
  MEDPLUM_CLIENT_ID: 'x',
  MEDPLUM_CLIENT_SECRET: 'x',
  EHR_MALWARE_SCAN_BACKEND: 'http',
  EHR_MALWARE_SCAN_HTTP_URL: 'https://scanner.example',
} as unknown as NodeJS.ProcessEnv;

describe('production readiness', () => {
  it('passes a fully-configured production env', () => {
    expect(checkProductionReadiness(ok)).toEqual([]);
  });

  it('refuses a mock malware scanner in production', () => {
    const issues = checkProductionReadiness({ ...ok, EHR_MALWARE_SCAN_BACKEND: 'mock_clean' });
    expect(issues.some((i) => i.key === 'EHR_MALWARE_SCAN_BACKEND')).toBe(true);
  });

  it('flags a missing required secret', () => {
    const issues = checkProductionReadiness({ ...ok, AUTH_SECRET: undefined });
    expect(issues.some((i) => i.key === 'AUTH_SECRET')).toBe(true);
  });

  it('is a no-op outside production (mock scanner is fine in dev)', () => {
    expect(checkProductionReadiness({ ...ok, NODE_ENV: 'development', EHR_MALWARE_SCAN_BACKEND: 'mock_clean' })).toEqual([]);
  });
});
