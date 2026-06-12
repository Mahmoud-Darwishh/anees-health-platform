import 'server-only';

import { type DnrStatus, type VisitStatus } from '@prisma/client';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';

export type PhysioVisitFlowState =
  | 'scheduled'
  | 'acknowledged'
  | 'en_route'
  | 'arrived'
  | 'checked_in'
  | 'checked_out'
  | 'closed';

export type PhysioVisitPrimaryAction =
  | 'acknowledge'
  | 'start_travel'
  | 'mark_arrived'
  | 'check_in'
  | 'document_session'
  | 'check_out'
  | null;

export type PhysioTodayVisit = {
  id: string;
  code: string;
  status: VisitStatus;
  effectiveState: string;
  scheduledDateIso: string;
  scheduledTime: string | null;
  serviceName: string;
  areaName: string | null;
  flowState: PhysioVisitFlowState;
  primaryAction: PhysioVisitPrimaryAction;
  canTransition: boolean;
  acknowledgedAtIso: string | null;
  enRouteAtIso: string | null;
  arrivedAtIso: string | null;
  checkInAtIso: string | null;
  checkOutAtIso: string | null;
  transitionTimeline: Array<{
    toState: string;
    createdAtIso: string;
    isOverride: boolean;
    overrideMethod: string | null;
  }>;
  patient: {
    id: string;
    code: string;
    fullName: string;
    arabicName: string | null;
    age: number | null;
    dnrStatus: DnrStatus | null;
    medplumPatientId: string | null;
    addressDetail: string | null;
    landmark: string | null;
    geofenceRadiusMeters: number | null;
  };
};

export type PhysioTodayData = {
  dateLabel: string;
  totalVisits: number;
  completedVisits: number;
  inProgressVisits: number;
  upcomingVisits: number;
  visits: PhysioTodayVisit[];
  warning: string | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getVisitFlowState(visit: {
  effectiveState: string | null;
  status: VisitStatus;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): PhysioVisitFlowState {
  if (visit.effectiveState) {
    if (visit.effectiveState === 'cancelled' || visit.effectiveState === 'no_show' || visit.effectiveState === 'completed') {
      return 'closed';
    }
    if (visit.effectiveState === 'checked_out') {
      return 'checked_out';
    }
    if (visit.effectiveState === 'checked_in') {
      return 'checked_in';
    }
    if (visit.effectiveState === 'arrived') {
      return 'arrived';
    }
    if (visit.effectiveState === 'en_route') {
      return 'en_route';
    }
    if (visit.effectiveState === 'acknowledged') {
      return 'acknowledged';
    }
  }

  if (visit.status === 'cancelled' || visit.status === 'no_show' || visit.status === 'completed') {
    return 'closed';
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

function getPrimaryAction(state: PhysioVisitFlowState): PhysioVisitPrimaryAction {
  if (state === 'scheduled') return 'acknowledge';
  if (state === 'acknowledged') return 'start_travel';
  if (state === 'en_route') return 'mark_arrived';
  if (state === 'arrived') return 'check_in';
  if (state === 'checked_in') return 'document_session';
  return null;
}

function calculateAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

async function readVisitState(visitId: string): Promise<string | null> {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { state: true },
    });
    return visit?.state ?? null;
  } catch {
    return null;
  }
}

async function readVisitTimeline(visitId: string): Promise<PhysioTodayVisit['transitionTimeline']> {
  try {
    const rows = await prisma.visitStateTransition.findMany({
      where: { visitId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        toState: true,
        createdAt: true,
        isOverride: true,
        overrideMethod: true,
      },
    });

    return rows.map((row) => ({
      toState: row.toState,
      createdAtIso: new Date(row.createdAt).toISOString(),
      isOverride: Boolean(row.isOverride),
      overrideMethod: row.overrideMethod,
    }));
  } catch {
    return [];
  }
}

export async function getPhysioTodayData(): Promise<PhysioTodayData> {
  const { user: staff } = await requireStaffCan('workspace.physio.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: {
      providerId: true,
    },
  });

  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  if (!staffRecord?.providerId) {
    return {
      dateLabel: formatDayLabel(today),
      totalVisits: 0,
      completedVisits: 0,
      inProgressVisits: 0,
      upcomingVisits: 0,
      visits: [],
      warning: 'Your staff account is not linked to a provider profile yet. Ask admin to connect Staff.providerId.',
    };
  }

  const visits = await prisma.visit.findMany({
    where: {
      tenantId: sessionTenantId(staff),
      providerId: staffRecord.providerId,
      scheduledDate: {
        gte: start,
        lte: end,
      },
      patient: {
        tenantId: sessionTenantId(staff),
        deletedAt: null,
      },
    },
    orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      code: true,
      status: true,
      scheduledDate: true,
      scheduledTime: true,
      acknowledgedAt: true,
      enRouteAt: true,
      arrivedAt: true,
      checkInAt: true,
      checkOutAt: true,
      patient: {
        select: {
          id: true,
          code: true,
          fullName: true,
          arabicName: true,
          dateOfBirth: true,
          dnrStatus: true,
          medplumPatientId: true,
          addressDetail: true,
          landmark: true,
          handoffGeofenceRadiusMeters: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
      area: {
        select: {
          name: true,
        },
      },
    },
  });

  const stateEntries = await Promise.all(
    visits.map(async (visit) => [visit.id, await readVisitState(visit.id)] as const),
  );
  const stateByVisitId = new Map<string, string | null>(stateEntries);

  const timelineEntries = await Promise.all(
    visits.map(async (visit) => [visit.id, await readVisitTimeline(visit.id)] as const),
  );
  const timelineByVisitId = new Map<string, PhysioTodayVisit['transitionTimeline']>(timelineEntries);

  const mappedVisits: PhysioTodayVisit[] = visits.map((visit) => {
    const effectiveState = stateByVisitId.get(visit.id) ?? null;
    const flowState = getVisitFlowState({ ...visit, effectiveState });
    const primaryAction = getPrimaryAction(flowState);
    const canTransition = !!primaryAction && !!visit.patient.medplumPatientId;

    return {
      id: visit.id,
      code: visit.code,
      status: visit.status,
      effectiveState: effectiveState ?? flowState,
      scheduledDateIso: visit.scheduledDate.toISOString(),
      scheduledTime: visit.scheduledTime,
      serviceName: visit.service.name,
      areaName: visit.area?.name ?? null,
      flowState,
      primaryAction,
      canTransition,
      acknowledgedAtIso: visit.acknowledgedAt?.toISOString() ?? null,
      enRouteAtIso: visit.enRouteAt?.toISOString() ?? null,
      arrivedAtIso: visit.arrivedAt?.toISOString() ?? null,
      checkInAtIso: visit.checkInAt?.toISOString() ?? null,
      checkOutAtIso: visit.checkOutAt?.toISOString() ?? null,
      transitionTimeline: timelineByVisitId.get(visit.id) ?? [],
      patient: {
        id: visit.patient.id,
        code: visit.patient.code,
        fullName: visit.patient.fullName,
        arabicName: visit.patient.arabicName,
        age: calculateAge(visit.patient.dateOfBirth),
        dnrStatus: visit.patient.dnrStatus,
        medplumPatientId: visit.patient.medplumPatientId,
        addressDetail: visit.patient.addressDetail,
        landmark: visit.patient.landmark,
        geofenceRadiusMeters: visit.patient.handoffGeofenceRadiusMeters,
      },
    };
  });

  const completedVisits = mappedVisits.filter((visit) => visit.flowState === 'closed' || visit.flowState === 'checked_out').length;
  const inProgressVisits = mappedVisits.filter((visit) => visit.flowState === 'checked_in').length;
  const upcomingVisits = Math.max(mappedVisits.length - completedVisits - inProgressVisits, 0);

  return {
    dateLabel: formatDayLabel(today),
    totalVisits: mappedVisits.length,
    completedVisits,
    inProgressVisits,
    upcomingVisits,
    visits: mappedVisits,
    warning: null,
  };
}
