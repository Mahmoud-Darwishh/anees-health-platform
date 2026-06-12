#!/usr/bin/env node
/*
 * Safety guard for `prisma db push`.
 *
 * `prisma db push` mutates the database schema directly, bypassing the
 * migration history. Run against production that can drop columns/tables and
 * cause irreversible data loss. Because local dev here points at a SHARED
 * production Postgres, an accidental `db:push` is a real outage risk.
 *
 * This guard refuses to proceed when DATABASE_URL points at a non-local host,
 * unless the caller explicitly opts in with `--allow-prod` (used only by the
 * deliberate `db:push:unsafe` script). It loads the same env files Prisma does
 * so it sees the exact URL the push would use.
 */

const fs = require('node:fs');
const path = require('node:path');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function readEnvFile(file) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return null;
  for (const rawLine of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== 'DATABASE_URL') continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return null;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  // .env.local wins over .env (Next.js convention), matching dev resolution.
  return readEnvFile('.env.local') || readEnvFile('.env');
}

function extractHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    const match = url.match(/@([^:/?]+)/);
    return match ? match[1].toLowerCase() : null;
  }
}

function fail(message) {
  console.error(`\n[31m✖ db:push blocked.[0m ${message}\n`);
  process.exit(1);
}

const allowProd = process.argv.includes('--allow-prod');
const url = resolveDatabaseUrl();

if (!url) {
  fail('DATABASE_URL is not set. Refusing to run an un-targeted schema push.');
}

const host = extractHost(url);
const isLocal = host !== null && LOCAL_HOSTS.has(host);

if (isLocal) {
  // Local database — `db:push` is a normal, safe dev workflow.
  process.exit(0);
}

if (!allowProd) {
  fail(
    `DATABASE_URL points at a non-local host ([1m${host ?? 'unknown'}[0m).\n` +
      '  `prisma db push` bypasses migrations and can DROP columns/tables on that database.\n' +
      '  - For schema changes, create a migration instead:  npm run db:migrate\n' +
      '  - If you are absolutely certain you want to push to this database, run:\n' +
      '        npm run db:push:unsafe',
  );
}

console.warn(
  `\n[33m⚠ db:push:unsafe — pushing schema directly to a NON-LOCAL database (${host ?? 'unknown'}).[0m\n` +
    '  This bypasses migration history and can cause irreversible data loss.\n',
);
process.exit(0);
