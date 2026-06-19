import 'server-only';

import type { DnrStatus, VisitStatus } from '@prisma/client';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import {
  buildClinicianTodayData,
  calculateAge,
  formatDayLabel,
  getPrimaryAction,
  getVisitFlowState,
  type ClinicianTodayData,
  type ClinicianVisitFlowState,
  type ClinicianVisitPrimaryAction,
} from '@/features/ehr/clinician-shared/visit-flow';

export type NurseTodayData = ClinicianTodayData;

export async function getNurseTodayData(): Promise<NurseTodayData> {
  const { user: staff } = await requireStaffCan('workspace.nursing.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { providerId: true },
  });

  if (!staffRecord?.providerId) {
    return {
      dateLabel: formatDayLabel(new Date()),
      totalVisits: 0,
      completedVisits: 0,
      inProgressVisits: 0,
      upcomingVisits: 0,
      visits: [],
      warning: 'Your staff account is not linked to a provider profile yet. Ask admin to connect Staff.providerId.',
    };
  }

  return buildClinicianTodayData({
    providerId: staffRecord.providerId,
    tenantId: sessionTenantId(staff),
  });
}

export type NurseSessionData = {
  visitId: string;
  code: string;
  scheduledTimeLabel: string;
  status: VisitStatus;
  flowState: ClinicianVisitFlowState;
  primaryAction: ClinicianVisitPrimaryAction;
  canDocument: boolean;
  patient: {
    fullName: string;
    arabicName: string | null;
    age: number | null;
    dnrStatus: DnrStatus | null;
    medplumPatientId: string;
    addressDetail: string | null;
    landmark: string | null;
  };
};

/**
 * Single-visit session context for the nurse, scoped to their provider profile.
 * Returns null when the visit is missing or out of scope (we do not distinguish
 * the two to the client). Throws only on a hard auth failure (gate).
 */
export async function getNurseSessionData(visitId: string): Promise<NurseSessionData | null> {
  const { user: staff } = await requireStaffCan('workspace.nursing.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { providerId: true },
  });

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, tenantId: sessionTenantId(staff), patient: { deletedAt: null } },
    select: {
      id: true,
      code: true,
      status: true,
      state: true,
      scheduledTime: true,
      providerId: true,
      acknowledgedAt: true,
      enRouteAt: true,
      arrivedAt: true,
      checkInAt: true,
      checkOutAt: true,
      patient: {
        select: {
          fullName: true,
          arabicName: true,
          dateOfBirth: true,
          dnrStatus: true,
          medplumPatientId: true,
          addressDetail: true,
          landmark: true,
        },
      },
    },
  });

  if (!visit || !visit.patient.medplumPatientId) {
    return null;
  }

  // Provider scope: a nurse may only open visits assigned to their provider.
  if (staff.staffRole === 'nurse' && (!staffRecord?.providerId || visit.providerId !== staffRecord.providerId)) {
    return null;
  }

  const flowState = getVisitFlowState({
    effectiveState: visit.state ?? null,
    status: visit.status,
    acknowledgedAt: visit.acknowledgedAt,
    enRouteAt: visit.enRouteAt,
    arrivedAt: visit.arrivedAt,
    checkInAt: visit.checkInAt,
    checkOutAt: visit.checkOutAt,
  });

  return {
    visitId: visit.id,
    code: visit.code,
    scheduledTimeLabel: visit.scheduledTime?.trim() || 'Time not set',
    status: visit.status,
    flowState,
    primaryAction: getPrimaryAction(flowState),
    // Documentation opens once on-site (checked in) and stays available after
    // check-out so the nurse can add or amend before leaving the record.
    canDocument: flowState === 'checked_in' || flowState === 'checked_out',
    patient: {
      fullName: visit.patient.fullName,
      arabicName: visit.patient.arabicName,
      age: calculateAge(visit.patient.dateOfBirth),
      dnrStatus: visit.patient.dnrStatus,
      medplumPatientId: visit.patient.medplumPatientId,
      addressDetail: visit.patient.addressDetail,
      landmark: visit.patient.landmark,
    },
  };
}
