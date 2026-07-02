import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for the ops watchdog (`src/lib/ops/watchdog.ts`). Prisma, the audit
 * seam, the notifier, and the logger are all mocked — no DB, no push. We assert
 * the pure orchestration: per-sweep counts aggregate into `totalFlagged`, the
 * no-show grace filter excludes not-yet-overdue rows, and a run only audits +
 * alerts the dispatch desk when something is actually flagged.
 */

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    visit: { findMany: vi.fn() },
    onlineBooking: { findMany: vi.fn() },
    nurseShiftAssignment: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/utils/app-logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/notifications', () => ({ notifyStaffByRoles: vi.fn() }));
vi.mock('@/lib/utils/audit', () => ({ recordAudit: vi.fn() }));

import { runOpsWatchdog } from '@/lib/ops/watchdog';
import { prisma } from '@/lib/db/prisma';
import { notifyStaffByRoles } from '@/lib/notifications';
import { recordAudit } from '@/lib/utils/audit';

const p = prisma as unknown as {
  visit: { findMany: ReturnType<typeof vi.fn> };
  onlineBooking: { findMany: ReturnType<typeof vi.fn> };
  nurseShiftAssignment: { findMany: ReturnType<typeof vi.fn> };
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(notifyStaffByRoles).mockResolvedValue({ targeted: 0, delivered: 0 });
  vi.mocked(recordAudit).mockResolvedValue(undefined as never);
});

describe('runOpsWatchdog', () => {
  it('flags nothing, and neither audits nor alerts, on a clean sweep', async () => {
    p.visit.findMany.mockResolvedValue([]);
    p.onlineBooking.findMany.mockResolvedValue([]);
    p.nurseShiftAssignment.findMany.mockResolvedValue([]);

    const report = await runOpsWatchdog('platform');

    expect(report.totalFlagged).toBe(0);
    expect(report.notified).toEqual({ targeted: 0, delivered: 0 });
    expect(recordAudit).not.toHaveBeenCalled();
    expect(notifyStaffByRoles).not.toHaveBeenCalled();
  });

  it('aggregates counts across sweeps and alerts the dispatch desk once', async () => {
    // Sweep order: no-show, stuck-in-transit, unassigned (all visit.findMany).
    p.visit.findMany
      .mockResolvedValueOnce([
        { code: 'N-OLD', scheduledDate: daysAgo(3), scheduledTime: '09:00' }, // overdue → counted
        { code: 'N-FUTURE', scheduledDate: daysAhead(3), scheduledTime: '09:00' }, // not overdue → excluded
      ])
      .mockResolvedValueOnce([{ code: 'S1' }])
      .mockResolvedValueOnce([{ code: 'U1' }]);
    p.onlineBooking.findMany.mockResolvedValue([{ bookingRef: 'BR1' }]);
    p.nurseShiftAssignment.findMany.mockResolvedValue([{ id: 'H1' }]);

    vi.mocked(notifyStaffByRoles).mockResolvedValue({ targeted: 4, delivered: 3 });

    const report = await runOpsWatchdog('platform');

    // no-show grace filter kept only the past-dated visit.
    expect(report.noShowRisk.count).toBe(1);
    expect(report.stuckInTransit.count).toBe(1);
    expect(report.unassignedBacklog.count).toBe(1);
    expect(report.paymentReconciliation.count).toBe(1);
    expect(report.unacknowledgedHandoffs.count).toBe(1);
    expect(report.totalFlagged).toBe(5);

    expect(recordAudit).toHaveBeenCalledTimes(1);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ tableName: 'ops_watchdog', changedBy: 'system:ops-watchdog' }),
    );

    expect(notifyStaffByRoles).toHaveBeenCalledTimes(1);
    const [tenantArg, rolesArg, payloadArg] = vi.mocked(notifyStaffByRoles).mock.calls[0];
    expect(tenantArg).toBe('platform');
    expect(rolesArg).toEqual(['superadmin', 'admin', 'medical_ops', 'operator']);
    expect(payloadArg.body).toContain('5 item(s)');
    expect(report.notified).toEqual({ targeted: 4, delivered: 3 });
  });

  it('keeps running when one sweep throws (best-effort, empty finding)', async () => {
    p.visit.findMany
      .mockRejectedValueOnce(new Error('db blip')) // no-show sweep fails
      .mockResolvedValueOnce([{ code: 'S1' }]) // stuck succeeds
      .mockResolvedValueOnce([]); // unassigned empty
    p.onlineBooking.findMany.mockResolvedValue([]);
    p.nurseShiftAssignment.findMany.mockResolvedValue([]);

    const report = await runOpsWatchdog('platform');

    expect(report.noShowRisk).toEqual({ count: 0, sample: [] });
    expect(report.stuckInTransit.count).toBe(1);
    expect(report.totalFlagged).toBe(1);
  });
});
