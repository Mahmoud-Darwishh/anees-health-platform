'use server';

import { revalidatePath } from 'next/cache';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import type { StaffRole } from '@prisma/client';
import {
  acknowledgeVisitAction as acknowledgeVisitAdminAction,
  startTravelAction as startTravelAdminAction,
  markArrivedAction as markArrivedAdminAction,
  checkInVisitAction as checkInVisitAdminAction,
  checkOutVisitAction as checkOutVisitAdminAction,
  createPhysioReportAction as createPhysioReportAdminAction,
  createAssessmentAction as createAssessmentAdminAction,
  declineVisitAction as declineVisitAdminAction,
  markRefusedAtDoorAction as markRefusedAtDoorAdminAction,
  markPatientNotHomeAction as markPatientNotHomeAdminAction,
  disputeVisitAction as disputeVisitAdminAction,
} from '@/features/ehr/admin-patient/actions';

const PHYSIO_WORKSPACE_ROLES = ['physiotherapist', 'admin', 'superadmin'] as const;

type PhysioWorkspaceContext = {
  staffId: string;
  staffRole: StaffRole;
  providerId: string | null;
};

async function assertPhysioWorkspaceAccess(): Promise<PhysioWorkspaceContext> {
  const staff = await getStaffUser([...PHYSIO_WORKSPACE_ROLES]);
  if (!staff?.staffId || !staff.staffRole) {
    throw new Error('Unauthorized');
  }

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { providerId: true },
  });

  return {
    staffId: staff.staffId,
    staffRole: staff.staffRole,
    providerId: staffRecord?.providerId ?? null,
  };
}

async function withTrustedVisitFormData(
  formData: FormData,
  context: PhysioWorkspaceContext,
): Promise<FormData> {
  const visitId = String(formData.get('physioVisitId') ?? '').trim();
  if (!visitId) {
    return formData;
  }

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      providerId: true,
      patient: {
        select: {
          medplumPatientId: true,
        },
      },
    },
  });

  if (!visit?.patient.medplumPatientId) {
    throw new Error('Visit or patient Medplum identifier not found.');
  }

  if (context.staffRole === 'physiotherapist') {
    if (!context.providerId || visit.providerId !== context.providerId) {
      throw new Error('This visit is outside your scope.');
    }
  }

  const trusted = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key === 'medplumPatientId') {
      continue;
    }
    trusted.append(key, value);
  }
  trusted.set('medplumPatientId', visit.patient.medplumPatientId);
  return trusted;
}

function revalidateClinicianViews(): void {
  revalidatePath('/clinician/today');
  revalidatePath('/clinician/patients');
}

function revalidateClinicianSessionView(formData: FormData): void {
  revalidateClinicianViews();
  const visitId = String(formData.get('physioVisitId') ?? '').trim();
  if (visitId) {
    revalidatePath(`/clinician/visits/${visitId}/session`);
  }
}

export async function acknowledgeVisitAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await acknowledgeVisitAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function startTravelAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await startTravelAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function markArrivedAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await markArrivedAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function checkInVisitAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await checkInVisitAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function checkOutVisitAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await checkOutVisitAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function createPhysioSessionReportAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await createPhysioReportAdminAction(trustedFormData);
  revalidateClinicianSessionView(formData);
}

export async function createPhysioAssessmentAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await createAssessmentAdminAction(trustedFormData);
  revalidateClinicianSessionView(formData);
}

export async function declineVisitAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await declineVisitAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function markRefusedAtDoorAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await markRefusedAtDoorAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function markPatientNotHomeAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await markPatientNotHomeAdminAction(trustedFormData);
  revalidateClinicianViews();
}

export async function disputeVisitAction(formData: FormData): Promise<void> {
  const context = await assertPhysioWorkspaceAccess();
  const trustedFormData = await withTrustedVisitFormData(formData, context);
  await disputeVisitAdminAction(trustedFormData);
  revalidateClinicianViews();
}
