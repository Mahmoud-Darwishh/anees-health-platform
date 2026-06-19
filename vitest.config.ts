import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest unit-test config (Phase 9). Tests live under `tests/` (never in `src/`).
 * They exercise PURE logic only — the RBAC matrix, the clinical-safety engines,
 * and the coded catalogs — so they never touch the (shared production) database
 * or Medplum. `server-only` is stubbed because the node test env has no Next.js
 * server/client boundary; the `@/` alias mirrors tsconfig `paths`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: [
      { find: 'server-only', replacement: path.resolve(__dirname, 'tests/stubs/server-only.ts') },
      { find: /^@\/(.*)$/, replacement: `${path.resolve(__dirname, 'src')}/$1` },
    ],
  },
});
