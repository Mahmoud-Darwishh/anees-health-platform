import 'server-only';
import { prisma } from '@/lib/db/prisma';

/**
 * Fallback derivation of a visit's workflow state from its legacy timestamp
 * columns, used when no `Visit.state` value has been persisted yet.
 */
export function deriveLocalVisitStateFallback(visit: {
  status: string;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): string {
  if (visit.status === 'cancelled' || visit.status === 'no_show' || visit.status === 'completed') {
    return visit.status;
  }
  if (visit.checkOutAt) {
    return 'checked_out';
  }
  if (visit.checkInAt) {
    return 'checked_in';
  }
  if (visit.arrivedAt) {
    return 'arrived';
  }
  if (visit.enRouteAt) {
    return 'en_route';
  }
  if (visit.acknowledgedAt) {
    return 'acknowledged';
  }
  return 'scheduled';
}

export async function readLocalVisitState(visitId: string): Promise<string | null> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { state: true },
  });
  return visit?.state ?? null;
}

export async function readLocalVisitTimeline(
  visitId: string,
): Promise<Array<{ toState: string; createdAt: string; isOverride: boolean; overrideMethod: string | null }>> {
  const rows = await prisma.visitStateTransition.findMany({
    where: { visitId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      toState: true,
      createdAt: true,
      isOverride: true,
      overrideMethod: true,
    },
  });

  return rows.map((row) => ({
    toState: row.toState,
    createdAt: row.createdAt.toISOString(),
    isOverride: row.isOverride,
    overrideMethod: row.overrideMethod,
  }));
}
