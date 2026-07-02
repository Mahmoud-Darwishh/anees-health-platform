'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AuditAction, type StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { getPatientTaskById, updatePatientTaskStatus } from '@/lib/medplum/tasks';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import {
  acknowledgeVisitAction as acknowledgeVisitAdminAction,
  startTravelAction as startTravelAdminAction,
  markArrivedAction as markArrivedAdminAction,
  checkInVisitAction as checkInVisitAdminAction,
  checkOutVisitAction as checkOutVisitAdminAction,
  recordVitalsAction as recordVitalsAdminAction,
  createDoctorNoteAction as createDoctorNoteAdminAction,
} from '@/features/ehr/admin-patient/actions';
import {
  formDataToInput,
  recordVitalsSchema,
  createDoctorNoteSchema,
} from '@/features/ehr/schemas/admin-patient-actions';
import type { DoctorFormState } from './types';
import type { ClinicianActionState } from '@/features/ehr/clinician-physio/action-state';

type DoctorWorkspaceContext = {
  staffId: string;
  staffRole: StaffRole;
  providerId: string | null;
};

/** One matrix-backed gate for the doctor field workspace. Throws 'Unauthorized'. */
async function assertDoctorWorkspaceAccess(): Promise<DoctorWorkspaceContext> {
  const { user } = await requireStaffCan('workspace.doctor.access');
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
 * Resolve + scope the visit referenced by the form. A doctor may only act on a
 * visit assigned to their own provider profile. Returns the patient's Medplum id
 * (the trusted, server-resolved identifier — never taken from the client form).
 */
async function resolveDoctorVisitMedplumId(formData: FormData, context: DoctorWorkspaceContext): Promise<string> {
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
  if (context.staffRole === 'doctor') {
    if (!context.providerId || visit.providerId !== context.providerId) {
      throw new Error('This visit is outside your scope.');
    }
  }
  return visit.patient.medplumPatientId;
}

function extractMedplumPatientId(reference: string | null | undefined): string | null {
  if (!reference) return null;
  const match = reference.match(/^Patient\/(.+)$/);
  return match ? match[1] : null;
}

/** Re-key the form with the SERVER-resolved patient id (never trust the client). */
function withTrustedPatientId(formData: FormData, medplumPatientId: string): FormData {
  const trusted = new FormData();
  for (const [key, value] of formData.entries()) {
    // Strip client-supplied identity + encounter references. The patient id is
    // re-set below from the server-resolved value; encounterId is dropped so a
    // signed note/vitals can never be attached to another patient's encounter.
    if (key === 'medplumPatientId' || key === 'encounterId') continue;
    trusted.append(key, value);
  }
  trusted.set('medplumPatientId', medplumPatientId);
  return trusted;
}

function revalidateDoctorViews(): void {
  revalidatePath('/clinician/doctor/today');
  revalidatePath('/clinician/doctor');
}

function revalidateDoctorSession(formData: FormData): void {
  revalidateDoctorViews();
  const visitId = String(formData.get('visitId') ?? '').trim();
  if (visitId) {
    revalidatePath(`/clinician/doctor/visits/${visitId}/session`);
  }
}

function toErrorState(error: unknown): DoctorFormState {
  if (error instanceof ZodError) {
    return { status: 'error', message: error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return { status: 'error', message: 'You are not authorised for this patient. Check that this visit is on your case list.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

// ── Visit-flow transitions (delegate to the canonical admin workflow actions,
//    which write the immutable VisitStateTransition ledger + audit) ───────────

async function runTransition(
  formData: FormData,
  adminAction: (formData: FormData) => Promise<void>,
  successMessage: string,
): Promise<ClinicianActionState> {
  try {
    const context = await assertDoctorWorkspaceAccess();
    const medplumPatientId = await resolveDoctorVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);
    // Surface a real failure inline instead of letting the admin action swallow
    // it into the /admin flash cookie the field clinician never sees.
    trusted.set('__rethrow', '1');
    await adminAction(trusted);
    revalidateDoctorViews();
    return { status: 'success', message: successMessage };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function doctorAcknowledgeVisitAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, acknowledgeVisitAdminAction, 'Visit acknowledged.');
}
export async function doctorStartTravelAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, startTravelAdminAction, 'Travel started.');
}
export async function doctorMarkArrivedAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, markArrivedAdminAction, 'Marked as arrived.');
}
export async function doctorCheckInVisitAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, checkInVisitAdminAction, 'Checked in.');
}
export async function doctorCheckOutVisitAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, checkOutVisitAdminAction, 'Checked out.');
}

// ── Clinical documentation (vitals, physician note). Validate up front for
//    doctor feedback, gate on the licensed clinical action, then delegate the
//    trusted write to the audited admin action. ───────────────────────────────

export async function recordDoctorVitalsAction(_prev: DoctorFormState, formData: FormData): Promise<DoctorFormState> {
  try {
    const context = await assertDoctorWorkspaceAccess();
    const medplumPatientId = await resolveDoctorVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    recordVitalsSchema.parse(formDataToInput(trusted));
    await requireStaffCan('vitals.record', { targetPatientMedplumId: medplumPatientId });

    await recordVitalsAdminAction(trusted, { rethrow: true });
    revalidateDoctorSession(formData);
    return { status: 'success', message: 'Vitals recorded and signed.' };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function recordDoctorNoteAction(_prev: DoctorFormState, formData: FormData): Promise<DoctorFormState> {
  try {
    const context = await assertDoctorWorkspaceAccess();
    const medplumPatientId = await resolveDoctorVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    createDoctorNoteSchema.parse(formDataToInput(trusted));
    await requireStaffCan('note.medical.sign', { targetPatientMedplumId: medplumPatientId });

    await createDoctorNoteAdminAction(trusted, { rethrow: true });
    revalidateDoctorSession(formData);
    return { status: 'success', message: 'Physician note signed.' };
  } catch (error) {
    return toErrorState(error);
  }
}

// ── Task queue (one-tap co-sign / acknowledge from the worklist) ──────────────

/**
 * One-tap co-sign / acknowledge from the doctor worklist. Completing the task is
 * the clinical attestation, so it is bound on BOTH axes the matrix intends for a
 * doctor's task queue (`write`, `case`, "own queue"): the task's patient must be
 * in this doctor's case-scope (`task.update` carries requiresCaseScope), AND the
 * task must be owned by this doctor's own Practitioner. Without this, a
 * client-supplied task id would let a doctor complete any task in the system —
 * including another clinician's red-flag co-sign. Admins/superadmins hold the
 * workspace without a provider identity and may co-sign on behalf (case-scope
 * still applies).
 */
export async function completeDoctorTaskAction(formData: FormData): Promise<void> {
  const { user } = await requireStaffCan('workspace.doctor.access');
  const taskId = String(formData.get('taskId') ?? '').trim();
  const expectedVersionId = String(formData.get('expectedVersionId') ?? '').trim() || null;
  if (!taskId) {
    throw new Error('Task id is required.');
  }

  // Resolve the task server-side — never trust the id alone.
  const task = await getPatientTaskById(taskId);
  if (!task) {
    throw new Error('Task not found.');
  }

  // Case-scope: the task's patient must be on this doctor's care team. task.update
  // carries requiresCaseScope, so this is where that gate actually runs.
  const patientMedplumId = extractMedplumPatientId(task.for?.reference);
  if (!patientMedplumId) {
    throw new Error('This task is not linked to a patient.');
  }
  await requireStaffCan('task.update', { targetPatientMedplumId: patientMedplumId });

  // Own-queue: a doctor may only clear tasks owned by their own Practitioner.
  if (user.staffRole === 'doctor') {
    const staffRecord = await prisma.staff.findUnique({
      where: { id: user.staffId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!staffRecord) {
      throw new Error('Could not resolve your staff profile.');
    }
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: staffRecord.id,
      name: staffRecord.name ?? staffRecord.email ?? `Staff ${staffRecord.id}`,
      email: staffRecord.email,
      role: staffRecord.role,
    });
    if (!task.owner?.reference || task.owner.reference !== practitioner.reference) {
      throw new Error('This task is not in your queue.');
    }
  }

  await updatePatientTaskStatus(taskId, 'completed', {
    expectedVersionId: expectedVersionId ?? task.meta?.versionId ?? null,
  });

  await writeMedplumAuditMirror({
    tableName: 'MedplumTask',
    recordId: taskId,
    action: AuditAction.update,
    changedFields: ['status'],
    changedBy: user.staffId,
    actorRole: user.staffRole,
    patientId: patientMedplumId,
  });

  revalidatePath('/clinician/doctor');
}
