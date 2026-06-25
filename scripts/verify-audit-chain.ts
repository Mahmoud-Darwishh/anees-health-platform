/**
 * Verify the AuditLog tamper-evidence chain against the database.
 *
 *   npm run audit:verify-chain            # most recent 10,000 rows
 *   npm run audit:verify-chain -- --limit=50000
 *
 * Exits 0 if the verified window is intact, 1 if any row's content hash no longer
 * matches (in-place edit) or a chain link is broken (deletion/reordering). Rows
 * written before the hash-chain feature (null hash) are counted but not treated
 * as breaks. Verifies the most-recent N rows as a contiguous slice (the oldest
 * row in the window is not link-checked, avoiding a boundary false positive).
 * Intended as a scheduled/on-demand compliance check — never on the request path.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db/prisma';
import { verifyAuditChainRows, type AuditChainRow } from '../src/lib/utils/audit-hash';

const DEFAULT_LIMIT = 10_000;

function parseLimit(): number {
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  const n = arg ? Number(arg.split('=')[1]) : DEFAULT_LIMIT;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LIMIT;
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const recent = await prisma.auditLog.findMany({
    orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      tableName: true,
      recordId: true,
      action: true,
      changedBy: true,
      changedFields: true,
      previousData: true,
      newData: true,
      hash: true,
      prevHash: true,
    },
  });
  const rows = recent.reverse(); // chronological (oldest → newest) for chain verification

  const result = verifyAuditChainRows(rows as unknown as AuditChainRow[]);
  console.log(
    `audit-chain: checked ${result.checked} of the most recent rows (limit ${limit}); ${result.verified} hashed+verified, ${result.breaks.length} break(s).`,
  );
  for (const b of result.breaks) {
    console.error(`  ✗ ${b.type} @ ${b.id}: ${b.detail}`);
  }
  if (result.ok) {
    console.log('audit-chain: ✅ intact');
  } else {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('audit-chain verify failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
