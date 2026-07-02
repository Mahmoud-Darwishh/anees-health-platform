'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import type { StaffRole } from '@prisma/client';
import type { ClinicianActionState } from './action-state';
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

type PhysioWorkspaceContext = {
  staffId: string;
  staffRole: StaffRole;
  providerId: string | null;
};

function toClinicianErrorState(error: unknown): ClinicianActionState {
  if (error instanceof ZodError) {
    return { status: 'error', message: error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return { status: 'error', message: 'You are not authorised for this visit. Check that it is on your list.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

async function assertPhysioWorkspaceAccess(): Promise<PhysioWorkspaceContext> {
  // One matrix-backed gate. Throws 'Unauthorized' unless the caller may enter
  // the physio workspace. Per-visit case scope is still enforced below in
  // `withTrustedVisitFormData`.
  const { user } = await requireStaffCan('workspace.physio.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: user.staffId! },
    select: { providerId: true },
  });

  return {
    staffId: user.staffId!,
    staffRole: user.staffRole!,
    providerId: staffRecord?.providerId ?? null,
  };
}

async function withTrustedVisitFormData(
  formData: FormData,
  context: PhysioWorkspaceContext,
  opts?: { rethrow?: boolean },
): Promise<FormData> {
  // Field forms standardize on `visitId`; fall back to the legacy `physioVisitId`
  // key for any form not yet migrated.
  const visitId = String(formData.get('visitId') ?? formData.get('physioVisitId') ?? '').trim();
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
    // Strip client-supplied identity + encounter references. The patient id is
    // re-set below from the server-resolved visit; encounter references are
    // dropped so a signed note/assessment/report can never be bound to another
    // patient's encounter (parity with the doctor workspace wrapper).
    if (key === 'medplumPatientId' || key === 'encounterId' || key === 'assessmentEncounterId') {
      continue;
    }
    trusted.append(key, value);
  }
  trusted.set('medplumPatientId', visit.patient.medplumPatientId);
  // B18: disruption events are timestamped at action time (server receipt), not
  // at page render — a form rendered minutes ago would otherwise back-date the
  // event. Transitions carry their own time fields and ignore eventAt.
  if (trusted.get('disruptionCode')) {
    trusted.set('eventAt', new Date().toISOString());
  }
  // When the caller renders inline feedback (useActionState), mark the trusted
  // payload so the underlying admin action rethrows a real failure to us instead
  // of swallowing it into the /admin flash cookie the field clinician never sees.
  if (opts?.rethrow) {
    trusted.set('__rethrow', '1');
  }
  return trusted;
}

function revalidateClinicianViews(): void {
  revalidatePath('/clinician/today');
  revalidatePath('/clinician/patients');
}

function revalidateClinicianSessionView(formData: FormData): void {
  revalidateClinicianViews();
  const visitId = String(formData.get('visitId') ?? formData.get('physioVisitId') ?? '').trim();
  if (visitId) {
    revalidatePath(`/clinician/visits/${visitId}/session`);
  }
}

export async function acknowledgeVisitAction(
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  try {
    const context = await assertPhysioWorkspaceAccess();
    const trustedFormData = await withTrustedVisitFormData(formData, context, { rethrow: true });
    await acknowledgeVisitAdminAction(trustedFormData);
    revalidateClinicianViews();
    return { status: 'success', message: 'Visit acknowledged.' };
  } catch (error) {
    return toClinicianErrorState(error);
  }
}

export async function startTravelAction(
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  try {
    const context = await assertPhysioWorkspaceAccess();
    const trustedFormData = await withTrustedVisitFormData(formData, context, { rethrow: true });
    await startTravelAdminAction(trustedFormData);
    revalidateClinicianViews();
    return { status: 'success', message: 'Travel started.' };
  } catch (error) {
    return toClinicianErrorState(error);
  }
}

export async function markArrivedAction(
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  try {
    const context = await assertPhysioWorkspaceAccess();
    const trustedFormData = await withTrustedVisitFormData(formData, context, { rethrow: true });
    await markArrivedAdminAction(trustedFormData);
    revalidateClinicianViews();
    return { status: 'success', message: 'Marked as arrived.' };
  } catch (error) {
    return toClinicianErrorState(error);
  }
}

export async function checkInVisitAction(
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  try {
    const context = await assertPhysioWorkspaceAccess();
    const trustedFormData = await withTrustedVisitFormData(formData, context, { rethrow: true });
    await checkInVisitAdminAction(trustedFormData);
    revalidateClinicianViews();
    return { status: 'success', message: 'Checked in.' };
  } catch (error) {
    return toClinicianErrorState(error);
  }
}

export async function checkOutVisitAction(
  _prev: ClinicianActionState,
  formData: FormData,
): Promise<ClinicianActionState> {
  try {
    const context = await assertPhysioWorkspaceAccess();
    const trustedFormData = await withTrustedVisitFormData(formData, context, { rethrow: true });
    await checkOutVisitAdminAction(trustedFormData);
    revalidateClinicianViews();
    return { status: 'success', message: 'Checked out.' };
  } catch (error) {
    return toClinicianErrorState(error);
  }
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
