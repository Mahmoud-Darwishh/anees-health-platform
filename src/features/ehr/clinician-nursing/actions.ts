'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import type { StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import {
  acknowledgeVisitAction as acknowledgeVisitAdminAction,
  startTravelAction as startTravelAdminAction,
  markArrivedAction as markArrivedAdminAction,
  checkInVisitAction as checkInVisitAdminAction,
  checkOutVisitAction as checkOutVisitAdminAction,
  recordVitalsAction as recordVitalsAdminAction,
  createAssessmentAction as createAssessmentAdminAction,
} from '@/features/ehr/admin-patient/actions';
import {
  formDataToInput,
  recordVitalsSchema,
  createAssessmentSchema,
} from '@/features/ehr/schemas/admin-patient-actions';
import type { NurseFormState } from './types';

type NurseWorkspaceContext = {
  staffId: string;
  staffRole: StaffRole;
  providerId: string | null;
};

/** One matrix-backed gate for the nurse field workspace. Throws 'Unauthorized'. */
async function assertNurseWorkspaceAccess(): Promise<NurseWorkspaceContext> {
  const { user } = await requireStaffCan('workspace.nursing.access');
  const staffRecord = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: { providerId: true },
  });
  return {
    staffId: user.staffId,
    staffRole: user.staffRole,
    providerId: staffRecord?.providerId ?? null,
  };
}

/**
 * Resolve + scope the visit referenced by the form. A nurse may only act on a
 * visit assigned to their own provider profile. Returns the patient's Medplum id
 * (the trusted, server-resolved identifier — never taken from the client form).
 */
async function resolveNurseVisitMedplumId(formData: FormData, context: NurseWorkspaceContext): Promise<string> {
  const visitId = String(formData.get('visitId') ?? '').trim();
  if (!visitId) {
    throw new Error('Missing visit reference.');
  }
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { providerId: true, patient: { select: { medplumPatientId: true } } },
  });
  if (!visit?.patient.medplumPatientId) {
    throw new Error('Visit or patient Medplum identifier not found.');
  }
  if (context.staffRole === 'nurse') {
    if (!context.providerId || visit.providerId !== context.providerId) {
      throw new Error('This visit is outside your scope.');
    }
  }
  return visit.patient.medplumPatientId;
}

/** Re-key the form with the SERVER-resolved patient id (never trust the client). */
function withTrustedPatientId(formData: FormData, medplumPatientId: string): FormData {
  const trusted = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key === 'medplumPatientId') continue;
    trusted.append(key, value);
  }
  trusted.set('medplumPatientId', medplumPatientId);
  return trusted;
}

function revalidateNurseViews(): void {
  revalidatePath('/clinician/nursing/today');
}

function revalidateNurseSession(formData: FormData): void {
  revalidateNurseViews();
  const visitId = String(formData.get('visitId') ?? '').trim();
  if (visitId) {
    revalidatePath(`/clinician/nursing/visits/${visitId}/session`);
  }
}

function toErrorState(error: unknown): NurseFormState {
  if (error instanceof ZodError) {
    return { status: 'error', message: error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return { status: 'error', message: 'You are not authorised for this patient. Check that this visit is on your roster.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

// ── Visit-flow transitions (delegate to the canonical admin workflow actions,
//    which write the immutable VisitStateTransition ledger + audit) ───────────

async function runTransition(
  formData: FormData,
  adminAction: (formData: FormData) => Promise<void>,
): Promise<void> {
  const context = await assertNurseWorkspaceAccess();
  const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
  await adminAction(withTrustedPatientId(formData, medplumPatientId));
  revalidateNurseViews();
}

export async function nurseAcknowledgeVisitAction(formData: FormData): Promise<void> {
  await runTransition(formData, acknowledgeVisitAdminAction);
}
export async function nurseStartTravelAction(formData: FormData): Promise<void> {
  await runTransition(formData, startTravelAdminAction);
}
export async function nurseMarkArrivedAction(formData: FormData): Promise<void> {
  await runTransition(formData, markArrivedAdminAction);
}
export async function nurseCheckInVisitAction(formData: FormData): Promise<void> {
  await runTransition(formData, checkInVisitAdminAction);
}
export async function nurseCheckOutVisitAction(formData: FormData): Promise<void> {
  await runTransition(formData, checkOutVisitAdminAction);
}

// ── Clinical documentation (vitals, assessments). Validate up front for nurse
//    feedback, gate on the licensed clinical action, then delegate the trusted
//    write to the audited admin action. ───────────────────────────────────────

export async function recordNurseVitalsAction(_prev: NurseFormState, formData: FormData): Promise<NurseFormState> {
  try {
    const context = await assertNurseWorkspaceAccess();
    const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    // Surface validation + licence/case-scope errors to the nurse directly.
    recordVitalsSchema.parse(formDataToInput(trusted));
    await requireStaffCan('vitals.record', { targetPatientMedplumId: medplumPatientId });

    await recordVitalsAdminAction(trusted);
    revalidateNurseSession(formData);
    return { status: 'success', message: 'Vitals recorded and signed.' };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function recordNurseAssessmentAction(_prev: NurseFormState, formData: FormData): Promise<NurseFormState> {
  try {
    const context = await assertNurseWorkspaceAccess();
    const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    createAssessmentSchema.parse(formDataToInput(trusted));
    await requireStaffCan('assessment.create', { targetPatientMedplumId: medplumPatientId });

    await createAssessmentAdminAction(trusted);
    revalidateNurseSession(formData);
    return { status: 'success', message: 'Assessment recorded and signed.' };
  } catch (error) {
    return toErrorState(error);
  }
}
