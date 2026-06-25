import { createHash } from 'node:crypto';

/**
 * Tamper-evidence primitives for the `AuditLog` chain.
 *
 * Every audit row carries a SHA-256 `hash` of its immutable content plus the
 * previous row's hash (`prevHash`). Recomputing a row's hash and comparing it to
 * the stored value detects any in-place edit of an audit record; comparing each
 * row's `prevHash` to the previous row's `hash` detects deletion/insertion.
 *
 * This is pure (no DB, no `server-only`) so it is unit-testable and reusable from
 * both the write path and the verifier. The chain may fork under highly
 * concurrent writes (two rows observing the same `prevHash`); the per-row content
 * hash remains authoritative for in-place tampering regardless.
 */

export type AuditHashContent = {
  tableName: string;
  recordId: string;
  action: string;
  changedBy?: string | null;
  changedFields?: unknown;
  previousData?: unknown;
  newData?: unknown;
};

/** Deterministic JSON: object keys sorted recursively so key order never changes the hash. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

/** SHA-256 hex of a row's immutable content chained to the previous row's hash. */
export function computeAuditHash(content: AuditHashContent, prevHash: string | null): string {
  const canonical = stableStringify({
    tableName: content.tableName,
    recordId: content.recordId,
    action: content.action,
    changedBy: content.changedBy ?? null,
    changedFields: content.changedFields ?? null,
    previousData: content.previousData ?? null,
    newData: content.newData ?? null,
    prevHash: prevHash ?? null,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export type AuditChainRow = AuditHashContent & {
  id: string;
  hash: string | null;
  prevHash: string | null;
};

export type AuditChainBreak = {
  id: string;
  type: 'content_mismatch' | 'broken_link';
  detail: string;
};

export type AuditChainVerification = {
  ok: boolean;
  checked: number;
  /** Rows with a non-null hash that were actually verifiable. */
  verified: number;
  breaks: AuditChainBreak[];
};

/**
 * Verify a chronologically-ordered (oldest → newest) slice of audit rows. Rows
 * with a null `hash` (written before this feature, or when hashing was skipped)
 * are counted but not treated as breaks. Pure — feed it rows from any source.
 */
export function verifyAuditChainRows(rows: AuditChainRow[]): AuditChainVerification {
  const breaks: AuditChainBreak[] = [];
  let verified = 0;
  let previousHash: string | null = null;
  let previousWasHashed = false;

  for (const row of rows) {
    if (row.hash === null) {
      previousHash = null;
      previousWasHashed = false;
      continue;
    }

    const expected = computeAuditHash(row, row.prevHash ?? null);
    if (expected !== row.hash) {
      breaks.push({
        id: row.id,
        type: 'content_mismatch',
        detail: 'recomputed hash does not match stored hash — row content was altered',
      });
    } else {
      verified += 1;
    }

    // Chain continuity: this row's prevHash must equal the previous hashed row's hash.
    if (previousWasHashed && (row.prevHash ?? null) !== previousHash) {
      breaks.push({
        id: row.id,
        type: 'broken_link',
        detail: 'prevHash does not match the prior row hash — a row may have been deleted or reordered',
      });
    }

    previousHash = row.hash;
    previousWasHashed = true;
  }

  return { ok: breaks.length === 0, checked: rows.length, verified, breaks };
}
