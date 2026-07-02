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
  createAssessmentAction as createAssessmentAdminAction,
  createNursingNoteAction as createNursingNoteAdminAction,
  createMedicationAdministrationAction as createMedicationAdministrationAdminAction,
  createIncidentReportAction as createIncidentReportAdminAction,
} from '@/features/ehr/admin-patient/actions';
import {
  formDataToInput,
  recordVitalsSchema,
  createAssessmentSchema,
  createNursingNoteSchema,
  createMedicationAdministrationSchema,
  createIncidentReportSchema,
} from '@/features/ehr/schemas/admin-patient-actions';
import type { NurseFormState } from './types';
import type { ClinicianActionState } from '@/features/ehr/clinician-physio/action-state';

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
  successMessage: string,
): Promise<ClinicianActionState> {
  try {
    const context = await assertNurseWorkspaceAccess();
    const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);
    // Surface a real failure inline instead of letting the admin action swallow
    // it into the /admin flash cookie the field clinician never sees.
    trusted.set('__rethrow', '1');
    await adminAction(trusted);
    revalidateNurseViews();
    return { status: 'success', message: successMessage };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function nurseAcknowledgeVisitAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, acknowledgeVisitAdminAction, 'Visit acknowledged.');
}
export async function nurseStartTravelAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, startTravelAdminAction, 'Travel started.');
}
export async function nurseMarkArrivedAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, markArrivedAdminAction, 'Marked as arrived.');
}
export async function nurseCheckInVisitAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, checkInVisitAdminAction, 'Checked in.');
}
export async function nurseCheckOutVisitAction(_prev: ClinicianActionState, formData: FormData): Promise<ClinicianActionState> {
  return runTransition(formData, checkOutVisitAdminAction, 'Checked out.');
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

    await recordVitalsAdminAction(trusted, { rethrow: true });
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

    await createAssessmentAdminAction(trusted, { rethrow: true });
    revalidateNurseSession(formData);
    return { status: 'success', message: 'Assessment recorded and signed.' };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function recordNurseNoteAction(_prev: NurseFormState, formData: FormData): Promise<NurseFormState> {
  try {
    const context = await assertNurseWorkspaceAccess();
    const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    createNursingNoteSchema.parse(formDataToInput(trusted));
    await requireStaffCan('note.nursing.sign', { targetPatientMedplumId: medplumPatientId });

    await createNursingNoteAdminAction(trusted, { rethrow: true });
    revalidateNurseSession(formData);
    return { status: 'success', message: 'Nursing note signed.' };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function recordNurseMedicationAction(_prev: NurseFormState, formData: FormData): Promise<NurseFormState> {
  try {
    const context = await assertNurseWorkspaceAccess();
    const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    createMedicationAdministrationSchema.parse(formDataToInput(trusted));
    await requireStaffCan('medication.administer', { targetPatientMedplumId: medplumPatientId });

    await createMedicationAdministrationAdminAction(trusted, { rethrow: true });
    revalidateNurseSession(formData);
    return { status: 'success', message: 'Medication administration recorded.' };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function raiseNurseIncidentAction(_prev: NurseFormState, formData: FormData): Promise<NurseFormState> {
  try {
    const context = await assertNurseWorkspaceAccess();
    const medplumPatientId = await resolveNurseVisitMedplumId(formData, context);
    const trusted = withTrustedPatientId(formData, medplumPatientId);

    createIncidentReportSchema.parse(formDataToInput(trusted));
    await requireStaffCan('incident_report.create', { targetPatientMedplumId: medplumPatientId });

    await createIncidentReportAdminAction(trusted, { rethrow: true });
    revalidateNurseSession(formData);
    return { status: 'success', message: 'Incident logged and routed to the care team.' };
  } catch (error) {
    return toErrorState(error);
  }
}

// ── Task queue (start / complete) ────────────────────────────────────────────
// A task mutation is bound on BOTH axes the matrix intends for a nurse's queue
// (tasks = write, case, "own queue"): the task's patient must be in this nurse's
// case-scope (task.update carries requiresCaseScope) AND the task must be owned
// by their own Practitioner. Without this, a client-supplied task id would let a
// nurse complete any task in the system, including another clinician's.

function extractMedplumPatientId(reference: string | null | undefined): string | null {
  if (!reference) return null;
  const match = reference.match(/^Patient\/(.+)$/);
  return match ? match[1] : null;
}

async function authorizeOwnNurseTask(
  taskId: string,
): Promise<{ staffId: string; staffRole: StaffRole; patientMedplumId: string; versionId: string | null }> {
  const { user } = await requireStaffCan('workspace.nursing.access');
  const task = await getPatientTaskById(taskId);
  if (!task) {
    throw new Error('Task not found.');
  }
  const patientMedplumId = extractMedplumPatientId(task.for?.reference);
  if (!patientMedplumId) {
    throw new Error('This task is not linked to a patient.');
  }
  // Case-scope: the task's patient must be on this nurse's care team.
  await requireStaffCan('task.update', { targetPatientMedplumId: patientMedplumId });
  // Own-queue: a nurse may only act on tasks owned by their own Practitioner.
  // (Admins/superadmins/med-ops act on behalf, gated by case-scope above.)
  if (user.staffRole === 'nurse') {
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
  return { staffId: user.staffId, staffRole: user.staffRole, patientMedplumId, versionId: task.meta?.versionId ?? null };
}

async function setNurseTaskStatus(formData: FormData, status: 'in-progress' | 'completed'): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '').trim();
  const expectedVersionId = String(formData.get('expectedVersionId') ?? '').trim() || null;
  if (!taskId) {
    throw new Error('Task id is required.');
  }
  const { staffId, staffRole, patientMedplumId, versionId } = await authorizeOwnNurseTask(taskId);
  await updatePatientTaskStatus(taskId, status, { expectedVersionId: expectedVersionId ?? versionId });
  await writeMedplumAuditMirror({
    tableName: 'MedplumTask',
    recordId: taskId,
    action: AuditAction.update,
    changedFields: ['status'],
    changedBy: staffId,
    actorRole: staffRole,
    patientId: patientMedplumId,
  });
  revalidatePath('/clinician/nursing/tasks');
}

export async function startNurseTaskAction(formData: FormData): Promise<void> {
  await setNurseTaskStatus(formData, 'in-progress');
}

export async function completeNurseTaskAction(formData: FormData): Promise<void> {
  await setNurseTaskStatus(formData, 'completed');
}
