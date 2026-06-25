import { describe, it, expect } from 'vitest';
import {
  computeAuditHash,
  verifyAuditChainRows,
  type AuditChainRow,
} from '@/lib/utils/audit-hash';

const base = {
  tableName: 'staff',
  recordId: 'abc',
  action: 'update',
  changedBy: 'staff_1',
  changedFields: { field: 'role', from: 'nurse', to: 'admin' },
};

/** Build a correctly-chained row from content + the previous row's hash. */
function chainRow(id: string, content: typeof base, prevHash: string | null): AuditChainRow {
  return { id, ...content, prevHash, hash: computeAuditHash(content, prevHash) };
}

describe('computeAuditHash', () => {
  it('is deterministic and order-independent in changedFields', () => {
    const a = computeAuditHash({ ...base, changedFields: { x: 1, y: 2 } }, null);
    const b = computeAuditHash({ ...base, changedFields: { y: 2, x: 1 } }, null);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when any audited field changes', () => {
    const original = computeAuditHash(base, null);
    expect(computeAuditHash({ ...base, changedBy: 'staff_2' }, null)).not.toBe(original);
    expect(computeAuditHash({ ...base, action: 'delete' }, null)).not.toBe(original);
    expect(computeAuditHash(base, 'different-prev')).not.toBe(original);
  });
});

describe('verifyAuditChainRows', () => {
  it('accepts an intact chain', () => {
    const r1 = chainRow('1', base, null);
    const r2 = chainRow('2', { ...base, recordId: 'def' }, r1.hash);
    const r3 = chainRow('3', { ...base, recordId: 'ghi' }, r2.hash);
    const result = verifyAuditChainRows([r1, r2, r3]);
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(3);
    expect(result.breaks).toHaveLength(0);
  });

  it('detects an in-place content edit (hash mismatch)', () => {
    const r1 = chainRow('1', base, null);
    const r2 = chainRow('2', { ...base, recordId: 'def' }, r1.hash);
    // Tamper: mutate a field but keep the old stored hash.
    const tampered = { ...r2, changedBy: 'attacker' };
    const result = verifyAuditChainRows([r1, tampered]);
    expect(result.ok).toBe(false);
    expect(result.breaks.some((b) => b.id === '2' && b.type === 'content_mismatch')).toBe(true);
  });

  it('detects a deleted row (broken chain link)', () => {
    const r1 = chainRow('1', base, null);
    const r2 = chainRow('2', { ...base, recordId: 'def' }, r1.hash);
    const r3 = chainRow('3', { ...base, recordId: 'ghi' }, r2.hash);
    // Delete r2 → r3.prevHash now points at a missing row.
    const result = verifyAuditChainRows([r1, r3]);
    expect(result.ok).toBe(false);
    expect(result.breaks.some((b) => b.id === '3' && b.type === 'broken_link')).toBe(true);
  });

  it('tolerates legacy rows with a null hash without flagging them', () => {
    const legacy: AuditChainRow = { id: '0', ...base, hash: null, prevHash: null };
    const r1 = chainRow('1', base, null);
    const result = verifyAuditChainRows([legacy, r1]);
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(2);
    expect(result.verified).toBe(1);
  });
});
