import 'server-only';

import type { Prisma, PrismaClient, VisitType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

/**
 * VISIT CREATION SERVICE (service-function-first).
 * ------------------------------------------------
 * The single place operational visits are minted from scratch — used by the ops
 * dispatch/scheduling screen, the package→series generator, and (in future) the
 * `/api/v1/ops/*` endpoints. Web forms and server actions are thin wrappers over
 * these functions so "web today, mobile tomorrow" stays true.
 *
 * A new visit is born UNASSIGNED-or-assigned, `status=scheduled`, `state=scheduled`,
 * with an initial immutable `VisitStateTransition` ledger row (from `null`) and an
 * audit entry — all in one transaction so the state column, ledger, and audit can
 * never diverge. Callers own notifications (assignment push, etc.) after commit.
 */

type Tx = Prisma.TransactionClient | PrismaClient;

function genVisitCode(seq = 0): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  // seq disambiguates same-millisecond series generation.
  return `VST_${Date.now()}_${seq}_${rand}`;
}

export type CreateVisitParams = {
  patientId: string;
  serviceId: string;
  scheduledDate: Date;
  scheduledTime?: string | null;
  providerId?: string | null;
  visitType: VisitType;
  carePlanId?: string | null;
  areaId?: string | null;
  /** Override the service list price. Defaults to the service's list price. */
  servicePriceEgp?: number | null;
  discountEgp?: number | null;
  notes?: string | null;
  tenantId: string;
  /** Actor id, e.g. `staff_<id>` or `system:<source>`. */
  bookedBy: string;
};

async function insertVisit(
  tx: Tx,
  params: CreateVisitParams,
  service: { listPriceEgp: Prisma.Decimal; defaultProviderPayoutEgp: Prisma.Decimal | null },
  seq: number,
): Promise<{ id: string; code: string }> {
  const price =
    params.servicePriceEgp != null ? params.servicePriceEgp : Number(service.listPriceEgp);
  const discount = params.discountEgp ?? 0;
  const net = Math.max(0, price - discount);
  const code = genVisitCode(seq);

  const visit = await tx.visit.create({
    data: {
      code,
      patientId: params.patientId,
      serviceId: params.serviceId,
      providerId: params.providerId ?? null,
      carePlanId: params.carePlanId ?? null,
      areaId: params.areaId ?? null,
      bookedDate: new Date(),
      scheduledDate: params.scheduledDate,
      scheduledTime: params.scheduledTime ?? null,
      status: 'scheduled',
      state: 'scheduled',
      visitType: params.visitType,
      servicePriceEgp: price,
      discountEgp: discount,
      netPriceEgp: net,
      providerPayoutEgp: service.defaultProviderPayoutEgp ?? 0,
      tenantId: params.tenantId,
      bookedBy: params.bookedBy,
      notes: params.notes ?? null,
    },
    select: { id: true, code: true },
  });

  // Initial ledger row (from null → scheduled) so the visit's very first state
  // change is auditable like every subsequent one.
  await tx.visitStateTransition.create({
    data: {
      visitId: visit.id,
      fromState: null,
      toState: 'scheduled',
      actorStaffId: params.bookedBy,
      actorSystem: params.bookedBy.startsWith('system:'),
      reasonNote: 'Visit created',
    },
  });

  await tx.auditLog.create({
    data: {
      tableName: 'visits',
      recordId: visit.id,
      action: 'create',
      changedFields: {
        source: 'visits.create_visit',
        serviceId: params.serviceId,
        assigned: Boolean(params.providerId),
        carePlanId: params.carePlanId ?? null,
      },
      changedBy: params.bookedBy,
    },
  });

  return visit;
}

async function resolveService(tx: Tx, serviceId: string, tenantId: string) {
  const service = await tx.service.findFirst({
    where: { id: serviceId, status: 'active' },
    select: { id: true, listPriceEgp: true, defaultProviderPayoutEgp: true },
  });
  if (!service) {
    throw new Error('Selected service is not available.');
  }
  // Guard the patient belongs to the tenant is the caller's job (they pass a
  // tenant-scoped patientId); we still record tenantId on the visit.
  void tenantId;
  return service;
}

/** Create a single visit. */
export async function createVisit(params: CreateVisitParams): Promise<{ id: string; code: string }> {
  return prisma.$transaction(async (tx) => {
    const service = await resolveService(tx, params.serviceId, params.tenantId);
    return insertVisit(tx, params, service, 0);
  });
}

export type CreateVisitSeriesParams = Omit<CreateVisitParams, 'scheduledDate'> & {
  /** First visit date; subsequent visits are spaced by `cadenceDays`. */
  firstDate: Date;
  sessionCount: number;
  cadenceDays: number;
  /** Optional care plan to create + link all visits to (opens an episode). */
  carePlan?: { planName: string; totalPriceEgp?: number | null } | null;
};

/**
 * Generate a whole visit series from a package purchase (e.g. 12 physio sessions
 * every 3 days). Optionally opens a CarePlan and links every visit to it. All
 * rows are written in one transaction — either the entire series lands or none
 * of it does.
 */
export async function createVisitSeries(
  params: CreateVisitSeriesParams,
): Promise<{ carePlanId: string | null; visits: { id: string; code: string }[] }> {
  const count = Math.max(1, Math.min(60, Math.floor(params.sessionCount)));
  const cadence = Math.max(1, Math.floor(params.cadenceDays));

  return prisma.$transaction(async (tx) => {
    const service = await resolveService(tx, params.serviceId, params.tenantId);

    let carePlanId: string | null = params.carePlanId ?? null;
    if (params.carePlan) {
      // Series end = last generated session date.
      const endDate = new Date(params.firstDate.getTime() + (count - 1) * cadence * 24 * 60 * 60 * 1000);
      const plan = await tx.carePlan.create({
        data: {
          code: `CP_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          patientId: params.patientId,
          planName: params.carePlan.planName,
          startDate: params.firstDate,
          endDate,
          totalVisitsPlanned: count,
          totalPriceEgp: params.carePlan.totalPriceEgp ?? 0,
          status: 'active',
          tenantId: params.tenantId,
        },
        select: { id: true },
      });
      carePlanId = plan.id;
    }

    const visits: { id: string; code: string }[] = [];
    for (let i = 0; i < count; i += 1) {
      const scheduledDate = new Date(params.firstDate.getTime() + i * cadence * 24 * 60 * 60 * 1000);
      const visit = await insertVisit(
        tx,
        { ...params, scheduledDate, carePlanId },
        service,
        i,
      );
      visits.push(visit);
    }

    return { carePlanId, visits };
  });
}

export type RescheduleVisitParams = {
  visitId: string;
  tenantId: string;
  newDate: Date;
  newTime?: string | null;
  changedBy: string;
  reason?: string | null;
};

/**
 * First-class, non-punitive reschedule: move an open visit to a new date/time
 * with no cancellation fee. Rejects visits that are already closed/settled (a
 * completed/cancelled visit is moved via the disruption path, not here). Audited.
 */
export async function rescheduleVisit(
  params: RescheduleVisitParams,
): Promise<{ id: string; code: string; previous: { date: Date; time: string | null } }> {
  const visit = await prisma.visit.findFirst({
    where: { id: params.visitId, tenantId: params.tenantId },
    select: { id: true, code: true, status: true, scheduledDate: true, scheduledTime: true },
  });
  if (!visit) {
    throw new Error('Visit not found.');
  }
  if (['completed', 'cancelled', 'no_show'].includes(visit.status)) {
    throw new Error('This visit is already closed and cannot be rescheduled.');
  }

  const previous = { date: visit.scheduledDate, time: visit.scheduledTime };

  await prisma.$transaction(async (tx) => {
    await tx.visit.update({
      where: { id: visit.id },
      data: { scheduledDate: params.newDate, scheduledTime: params.newTime ?? null, status: 'scheduled' },
    });
    await tx.auditLog.create({
      data: {
        tableName: 'visits',
        recordId: visit.id,
        action: 'update',
        changedFields: {
          source: 'visits.reschedule',
          field: 'scheduledDate',
          from: previous.date.toISOString(),
          to: params.newDate.toISOString(),
          fromTime: previous.time,
          toTime: params.newTime ?? null,
          reason: params.reason ?? null,
        },
        changedBy: params.changedBy,
      },
    });
  });

  return { id: visit.id, code: visit.code, previous };
}
