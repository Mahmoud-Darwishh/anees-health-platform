import 'server-only';

import type { StaffRole, VisitStatus, VisitType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { startOfDay, endOfDay } from '@/features/ehr/clinician-shared/visit-flow';
import { listPractitionerAvailability, dayCodeForDate, slotForDay, type PractitionerAvailability } from '@/lib/medplum/availability';

export type DispatchVisit = {
  id: string;
  code: string;
  scheduledDateIso: string;
  scheduledTime: string | null;
  visitType: VisitType;
  serviceName: string;
  status: VisitStatus;
  state: string | null;
  patient: { fullName: string; code: string; medplumPatientId: string | null; dnr: boolean };
  clinicianName: string | null;
  /** Scheduled before today and still open — i.e. a backlog item at risk of being dropped. */
  overdue: boolean;
};

export type ClinicianOption = {
  staffId: string;
  name: string;
  role: StaffRole;
  todayCount: number;
  /** Has the clinician declared any availability (days or areas)? */
  availabilitySet: boolean;
  /** Is today within a declared working window? */
  availableToday: boolean;
  /** e.g. "09:00–17:00" when available today, else null. */
  todayWindowLabel: string | null;
  areas: string[];
};

export type DispatchBoardData = {
  todays: DispatchVisit[];
  unassigned: DispatchVisit[];
  upcoming: DispatchVisit[];
  clinicians: ClinicianOption[];
};

export type SchedulingServiceOption = {
  id: string;
  name: string;
  categoryName: string;
  listPriceEgp: number;
  durationMins: number;
};

export type SchedulingCatalog = {
  services: SchedulingServiceOption[];
};

/**
 * Lookup data for the ops "create visit" form: the active service catalogue with
 * default price + duration. Tenant-agnostic (services are a shared catalogue).
 */
export async function getSchedulingCatalog(): Promise<SchedulingCatalog> {
  const services = await prisma.service.findMany({
    where: { status: 'active' },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      listPriceEgp: true,
      durationMins: true,
      category: { select: { name: true } },
    },
  });

  return {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      categoryName: s.category.name,
      listPriceEgp: Number(s.listPriceEgp),
      durationMins: s.durationMins,
    })),
  };
}

const CLINICAL_DISCIPLINES: StaffRole[] = ['doctor', 'nurse', 'physiotherapist'];

function mapVisit(
  visit: {
    id: string;
    code: string;
    scheduledDate: Date;
    scheduledTime: string | null;
    visitType: VisitType;
    status: VisitStatus;
    state: string | null;
    providerId: string | null;
    service: { name: string };
    patient: { fullName: string; code: string; medplumPatientId: string | null; dnrStatus: string | null };
  },
  providerNameById: Map<string, string>,
  todayStartMs: number,
): DispatchVisit {
  return {
    id: visit.id,
    code: visit.code,
    scheduledDateIso: visit.scheduledDate.toISOString(),
    scheduledTime: visit.scheduledTime,
    visitType: visit.visitType,
    status: visit.status,
    state: visit.state,
    serviceName: visit.service.name,
    patient: {
      fullName: visit.patient.fullName,
      code: visit.patient.code,
      medplumPatientId: visit.patient.medplumPatientId,
      dnr: visit.patient.dnrStatus === 'dnr',
    },
    clinicianName: visit.providerId ? providerNameById.get(visit.providerId) ?? 'Assigned' : null,
    overdue: visit.scheduledDate.getTime() < todayStartMs,
  };
}

const VISIT_SELECT = {
  id: true,
  code: true,
  scheduledDate: true,
  scheduledTime: true,
  visitType: true,
  status: true,
  state: true,
  providerId: true,
  service: { select: { name: true } },
  patient: { select: { fullName: true, code: true, medplumPatientId: true, dnrStatus: true } },
} as const;

/**
 * Case-manager dispatch board: visits needing a clinician, the next 2 days of
 * assigned visits, and the assignable clinician roster with today's load. This
 * is a next-24/48h SCHEDULING board (no real-time tracking — we run scheduled
 * home care, not emergencies). Tenant-scoped.
 */
export async function getDispatchBoardData(tenantId: string): Promise<DispatchBoardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const horizonEnd = endOfDay(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));

  const clinicianStaff = await prisma.staff.findMany({
    where: { tenantId, status: 'active', role: { in: CLINICAL_DISCIPLINES }, providerId: { not: null } },
    select: { id: true, name: true, role: true, providerId: true, medplumPractitionerId: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  const providerNameById = new Map<string, string>();
  for (const staff of clinicianStaff) {
    if (staff.providerId) providerNameById.set(staff.providerId, staff.name);
  }

  const [todaysRows, unassignedRows, upcomingRows, todaysAssigned] = await Promise.all([
    prisma.visit.findMany({
      where: { tenantId, scheduledDate: { gte: todayStart, lte: endOfDay(now) } },
      orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'asc' }],
      take: 200,
      select: VISIT_SELECT,
    }),
    prisma.visit.findMany({
      // Unassigned scheduled visits are a backlog that must be cleared regardless
      // of date. Including overdue (pre-today) rows here is what stops a paid
      // customer from being silently dropped; oldest-first so the most overdue
      // surface at the top.
      where: { tenantId, providerId: null, status: 'scheduled' },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      take: 100,
      select: VISIT_SELECT,
    }),
    prisma.visit.findMany({
      where: {
        tenantId,
        providerId: { not: null },
        status: { in: ['scheduled', 'in_progress'] },
        scheduledDate: { gte: todayStart, lte: horizonEnd },
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      take: 200,
      select: VISIT_SELECT,
    }),
    prisma.visit.findMany({
      where: {
        tenantId,
        providerId: { not: null },
        scheduledDate: { gte: todayStart, lte: endOfDay(now) },
      },
      select: { providerId: true },
    }),
  ]);

  const todayCountByProvider = new Map<string, number>();
  for (const visit of todaysAssigned) {
    if (visit.providerId) {
      todayCountByProvider.set(visit.providerId, (todayCountByProvider.get(visit.providerId) ?? 0) + 1);
    }
  }

  // Declared availability (Medplum PractitionerRole) — best-effort: a Medplum
  // hiccup must not break the board, so an empty map degrades to "Not set".
  let availabilityByRef = new Map<string, PractitionerAvailability>();
  try {
    availabilityByRef = await listPractitionerAvailability();
  } catch {
    availabilityByRef = new Map();
  }
  const todayCode = dayCodeForDate(now);
  const todayStartMs = todayStart.getTime();

  return {
    todays: todaysRows.map((v) => mapVisit(v, providerNameById, todayStartMs)),
    unassigned: unassignedRows.map((v) => mapVisit(v, providerNameById, todayStartMs)),
    upcoming: upcomingRows.map((v) => mapVisit(v, providerNameById, todayStartMs)),
    clinicians: clinicianStaff.map((staff) => {
      const availability = staff.medplumPractitionerId
        ? availabilityByRef.get(`Practitioner/${staff.medplumPractitionerId}`)
        : undefined;
      const todaySlot = availability ? slotForDay(availability, todayCode) : null;
      const availabilitySet = !!availability && (availability.slots.length > 0 || availability.areas.length > 0);

      return {
        staffId: staff.id,
        name: staff.name,
        role: staff.role,
        todayCount: staff.providerId ? todayCountByProvider.get(staff.providerId) ?? 0 : 0,
        availabilitySet,
        availableToday: !!todaySlot,
        todayWindowLabel: todaySlot ? `${todaySlot.startTime}–${todaySlot.endTime}` : null,
        areas: availability?.areas ?? [],
      };
    }),
  };
}
