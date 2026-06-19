#!/usr/bin/env node
/**
 * Tenant-scope guard (Phase 9) — a CI ratchet, in the same spirit as
 * `guard-logical-css.cjs`.
 *
 * Cross-tenant reads are a P0. Every Prisma query on a tenant-scoped model MUST
 * constrain the tenant. This guard scans `src/` for read/write calls on those
 * models and flags any whose argument does NOT reference a recognised scoping
 * signal (`tenantId`, `sessionTenantId`, `tenantWhere`, `nestedPatientTenantWhere`,
 * or `medplumPatientId` — globally-unique, so it pins the patient/tenant).
 *
 * It is heuristic (regex, not a type-checker), so it ratchets against a baseline:
 * existing accepted call sites live in `tenant-scope-baseline.json`; the guard
 * fails only when a NEW unscoped call appears. Run with `--update` to re-baseline
 * after a deliberate, reviewed change; `--list` to print all current findings.
 *
 *   npm run lint:tenant            # CI: fail on new unscoped queries
 *   node scripts/guard-tenant-scope.cjs --list
 *   node scripts/guard-tenant-scope.cjs --update
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(__dirname, 'tenant-scope-baseline.json');

// Models with a `tenantId` column (see prisma/schema.prisma + CLAUDE.md tenancy).
const TENANT_MODELS = [
  'patient', 'provider', 'visit', 'carePlan', 'invoice', 'onlineBooking',
  'staff', 'coverage', 'priorAuth', 'claim', 'controlledSubstanceLedger',
];
// Operations that read/write rows (findUnique is by a unique key → already scoped).
const OPS = ['findMany', 'findFirst', 'updateMany', 'deleteMany', 'count', 'aggregate', 'groupBy', 'create', 'createMany', 'update', 'upsert'];
const SCOPE_SIGNALS = ['tenantId', 'sessionTenantId', 'tenantWhere', 'nestedPatientTenantWhere', 'medplumPatientId'];

const callRe = new RegExp(`\\bprisma\\.(${TENANT_MODELS.join('|')})\\.(${OPS.join('|')})\\b`, 'g');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** From the `(` after the call, return the balanced argument text. */
function balancedArgs(text, openParenIndex) {
  let depth = 0;
  for (let i = openParenIndex; i < text.length && i < openParenIndex + 4000; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(openParenIndex, i + 1);
    }
  }
  return text.slice(openParenIndex, openParenIndex + 600);
}

function findings() {
  const results = [];
  for (const file of walk(SRC, [])) {
    const text = fs.readFileSync(file, 'utf8');
    let m;
    callRe.lastIndex = 0;
    while ((m = callRe.exec(text)) !== null) {
      const parenIndex = text.indexOf('(', m.index + m[0].length);
      if (parenIndex === -1) continue;
      const args = balancedArgs(text, parenIndex);
      if (SCOPE_SIGNALS.some((signal) => args.includes(signal))) continue;
      const line = text.slice(0, m.index).split('\n').length;
      results.push({ id: `${path.relative(ROOT, file).replace(/\\/g, '/')}:${m[1]}.${m[2]}`, line });
    }
  }
  return results;
}

function loadBaseline() {
  try {
    return new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8')));
  } catch {
    return new Set();
  }
}

const args = process.argv.slice(2);
const all = findings();

if (args.includes('--list')) {
  for (const f of all) console.log(`${f.id}  (line ${f.line})`);
  console.log(`\n${all.length} unscoped tenant-model call site(s).`);
  process.exit(0);
}

if (args.includes('--update')) {
  const ids = [...new Set(all.map((f) => f.id))].sort();
  fs.writeFileSync(BASELINE, `${JSON.stringify(ids, null, 2)}\n`);
  console.log(`Baseline updated: ${ids.length} accepted call site(s).`);
  process.exit(0);
}

const baseline = loadBaseline();
const novel = all.filter((f) => !baseline.has(f.id));
if (novel.length > 0) {
  console.error('✗ Tenant-scope guard: new Prisma call(s) on a tenant model without a tenant filter:\n');
  for (const f of novel) console.error(`  ${f.id}  (line ${f.line})`);
  console.error('\nScope it (tenantId / sessionTenantId / nested patient tenant / medplumPatientId), or — if intentional — run `npm run lint:tenant -- --update` after review.');
  process.exit(1);
}
console.log(`✓ Tenant-scope guard: no new unscoped tenant-model queries (${baseline.size} baselined).`);
process.exit(0);
