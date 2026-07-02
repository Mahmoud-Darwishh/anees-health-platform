import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/app-logger';
import { notifyStaffByRoles } from '@/lib/notifications';
import { recordAudit } from '@/lib/utils/audit';

/**
 * OPS WATCHDOG (service-function-first).
 * --------------------------------------
 * A single idempotent sweep the scheduler pokes on a fixed cadence. It DETECTS
 * operational drift and RAISES it — it never silently mutates money-affecting
 * state (no auto no-show, no auto-cancel). Each sweep returns counts + a bounded
 * sample of offending ids; when anything is actionable it pings the dispatch
 * desk (push) and writes ONE durable audit row so there is a trail the run
 * happened and what it found. Actual resolution stays a human decision on the
 * ops board.
 *
 * Thresholds are deliberately conservative and centralised here so they can be
 * tuned without touching the route.
 */

// Grace + staleness windows (minutes).
const NO_SHOW_GRACE_MIN = 90; // past scheduled start with no check-in
const IN_TRANSIT_STALE_MIN = 120; // stuck en_route / arrived
const UNASSIGNED_HORIZON_HOURS = 24; // upcoming, still unassigned
const PAYMENT_STALE_MIN = 60; // booking stuck mid-payment
const HANDOFF_SLA_MIN = 30; // incoming nurse hasn't acknowledged past shift start

const DISPATCH_ALERT_ROLES = ['superadmin', 'admin', 'medical_ops', 'operator'] as const;
const SAMPLE_LIMIT = 25;

export type WatchdogFinding = {
  count: number;
  /** A bounded sample of human-readable references (visit codes / booking refs). */
  sample: string[];
};

export type WatchdogReport = {
  tenantId: string;
  ranAt: string;
  noShowRisk: WatchdogFinding;
  stuckInTransit: WatchdogFinding;
  unassignedBacklog: WatchdogFinding;
  paymentReconciliation: WatchdogFinding;
  unacknowledgedHandoffs: WatchdogFinding;
  totalFlagged: number;
  notified: { targeted: number; delivered: number };
};

/** Combine a date-only `scheduledDate` and an "HH:mm" `scheduledTime` into an instant (Cairo, UTC+2). */
function scheduledInstant(scheduledDate: Date, scheduledTime: string | null): Date {
  const y = scheduledDate.getUTCFullYear();
  const m = String(scheduledDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(scheduledDate.getUTCDate()).padStart(2, '0');
  const time = scheduledTime && /^\d{2}:\d{2}$/.test(scheduledTime) ? scheduledTime : '09:00';
  return new Date(`${y}-${m}-${d}T${time}:00+02:00`);
}

function emptyFinding(): WatchdogFinding {
  return { count: 0, sample: [] };
}

/**
 * Run every operational sweep for a tenant. Best-effort per-sweep: one failing
 * sweep is logged and returns empty rather than aborting the whole run.
 */
export async function runOpsWatchdog(tenantId: string): Promise<WatchdogReport> {
  const now = new Date();

  const noShowRisk = await sweepNoShowRisk(tenantId, now).catch((error) => {
    logger.error('[watchdog] no-show sweep failed', { tenantId, error: msg(error) });
    return emptyFinding();
  });
  const stuckInTransit = await sweepStuckInTransit(tenantId, now).catch((error) => {
    logger.error('[watchdog] in-transit sweep failed', { tenantId, error: msg(error) });
    return emptyFinding();
  });
  const unassignedBacklog = await sweepUnassignedBacklog(tenantId, now).catch((error) => {
    logger.error('[watchdog] unassigned sweep failed', { tenantId, error: msg(error) });
    return emptyFinding();
  });
  const paymentReconciliation = await sweepPaymentReconciliation(tenantId, now).catch((error) => {
    logger.error('[watchdog] payment sweep failed', { tenantId, error: msg(error) });
    return emptyFinding();
  });
  const unacknowledgedHandoffs = await sweepUnacknowledgedHandoffs(tenantId, now).catch((error) => {
    logger.error('[watchdog] handoff sweep failed', { tenantId, error: msg(error) });
    return emptyFinding();
  });

  const totalFlagged =
    noShowRisk.count +
    stuckInTransit.count +
    unassignedBacklog.count +
    paymentReconciliation.count +
    unacknowledgedHandoffs.count;

  let notified = { targeted: 0, delivered: 0 };
  if (totalFlagged > 0) {
    // One durable trail row per run when there is something to see.
    await recordAudit({
      tableName: 'ops_watchdog',
      recordId: `watchdog:${tenantId}:${now.toISOString().slice(0, 13)}`,
      action: 'update',
      changedBy: 'system:ops-watchdog',
      changedFields: {
        source: 'ops.watchdog',
        noShowRisk: noShowRisk.count,
        stuckInTransit: stuckInTransit.count,
        unassignedBacklog: unassignedBacklog.count,
        paymentReconciliation: paymentReconciliation.count,
        unacknowledgedHandoffs: unacknowledgedHandoffs.count,
      },
    }).catch(() => {});

    notified = await notifyStaffByRoles(tenantId, [...DISPATCH_ALERT_ROLES], {
      title: 'Ops watchdog',
      body: `${totalFlagged} item(s) need attention: ` +
        `${noShowRisk.count} no-show risk, ${stuckInTransit.count} stuck, ` +
        `${unassignedBacklog.count} unassigned, ${paymentReconciliation.count} payment, ` +
        `${unacknowledgedHandoffs.count} handoff.`,
      url: '/admin/ops',
    });
  }

  return {
    tenantId,
    ranAt: now.toISOString(),
    noShowRisk,
    stuckInTransit,
    unassignedBacklog,
    paymentReconciliation,
    unacknowledgedHandoffs,
    totalFlagged,
    notified,
  };
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}

/** Scheduled visits whose start time has passed by the grace window with no check-in. */
async function sweepNoShowRisk(tenantId: string, now: Date): Promise<WatchdogFinding> {
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const candidates = await prisma.visit.findMany({
    where: {
      tenantId,
      status: 'scheduled',
      checkInAt: null,
      checkOutAt: null,
      state: { in: ['scheduled', 'acknowledged'] },
      scheduledDate: { lte: startOfToday },
      patient: { is: { deletedAt: null } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 200,
    select: { code: true, scheduledDate: true, scheduledTime: true },
  });

  const graceMs = NO_SHOW_GRACE_MIN * 60_000;
  const overdue = candidates.filter(
    (v) => now.getTime() - scheduledInstant(v.scheduledDate, v.scheduledTime).getTime() > graceMs,
  );

  return { count: overdue.length, sample: overdue.slice(0, SAMPLE_LIMIT).map((v) => v.code) };
}

/** Visits stuck in an in-transit / on-site state well past when they should have moved. */
async function sweepStuckInTransit(tenantId: string, now: Date): Promise<WatchdogFinding> {
  const cutoff = new Date(now.getTime() - IN_TRANSIT_STALE_MIN * 60_000);
  const rows = await prisma.visit.findMany({
    where: {
      tenantId,
      state: { in: ['en_route', 'arrived'] },
      updatedAt: { lt: cutoff },
      patient: { is: { deletedAt: null } },
    },
    orderBy: { updatedAt: 'asc' },
    take: 100,
    select: { code: true },
  });
  return { count: rows.length, sample: rows.slice(0, SAMPLE_LIMIT).map((v) => v.code) };
}

/** Upcoming visits (within the horizon) that still have no clinician assigned. */
async function sweepUnassignedBacklog(tenantId: string, now: Date): Promise<WatchdogFinding> {
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(now.getTime() + UNASSIGNED_HORIZON_HOURS * 3_600_000);

  const rows = await prisma.visit.findMany({
    where: {
      tenantId,
      providerId: null,
      status: 'scheduled',
      state: { in: ['draft', 'scheduled'] },
      scheduledDate: { gte: startOfToday, lte: horizon },
      patient: { is: { deletedAt: null } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 100,
    select: { code: true },
  });
  return { count: rows.length, sample: rows.slice(0, SAMPLE_LIMIT).map((v) => v.code) };
}

/** Online bookings stuck mid-payment past the stale window — need webhook reconciliation. */
async function sweepPaymentReconciliation(tenantId: string, now: Date): Promise<WatchdogFinding> {
  const cutoff = new Date(now.getTime() - PAYMENT_STALE_MIN * 60_000);
  const rows = await prisma.onlineBooking.findMany({
    where: {
      tenantId,
      status: { in: ['pending', 'payment_pending'] },
      kashierSessionId: { not: null },
      paymentCompletedAt: null,
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: { bookingRef: true },
  });
  return { count: rows.length, sample: rows.slice(0, SAMPLE_LIMIT).map((b) => b.bookingRef) };
}

/** Nurse handoffs where the incoming nurse hasn't acknowledged past the SLA after shift start. */
async function sweepUnacknowledgedHandoffs(tenantId: string, now: Date): Promise<WatchdogFinding> {
  const cutoff = new Date(now.getTime() - HANDOFF_SLA_MIN * 60_000);
  const rows = await prisma.nurseShiftAssignment.findMany({
    where: {
      incomingNurseStaffId: { not: null },
      acknowledgedAt: null,
      shiftStartAt: { lt: cutoff },
      status: { in: ['scheduled', 'in_progress'] },
      patient: { is: { tenantId, deletedAt: null } },
    },
    orderBy: { shiftStartAt: 'asc' },
    take: 100,
    select: { id: true },
  });
  return { count: rows.length, sample: rows.slice(0, SAMPLE_LIMIT).map((r) => r.id) };
}
