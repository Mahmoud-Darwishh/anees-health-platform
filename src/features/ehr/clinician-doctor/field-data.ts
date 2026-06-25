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

export type DoctorTodayData = ClinicianTodayData;

/**
 * The doctor's "My Journey" — today's home visits assigned to their provider
 * profile, mapped through the shared field-visit flow. Doctors only do scheduled
 * visits at launch (review/sign is the bulk of the role); this is the same
 * provider-scoped today list the nurse + physio apps use.
 */
export async function getDoctorTodayData(): Promise<DoctorTodayData> {
  const { user: staff } = await requireStaffCan('workspace.doctor.access');

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

export type DoctorSessionData = {
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
 * Single-visit session context for the doctor, scoped to their provider profile.
 * Returns null when the visit is missing or out of scope (the two are not
 * distinguished to the client). Throws only on a hard auth failure (the gate).
 */
export async function getDoctorSessionData(visitId: string): Promise<DoctorSessionData | null> {
  const { user: staff } = await requireStaffCan('workspace.doctor.access');

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

  // Provider scope: a doctor may only open visits assigned to their provider.
  // (Admins/superadmins hold the workspace without a provider restriction.)
  if (staff.staffRole === 'doctor' && (!staffRecord?.providerId || visit.providerId !== staffRecord.providerId)) {
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
    // Documentation opens on-site (checked in) and stays available after
    // check-out so the doctor can add or amend before leaving the record.
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
