'use server';

import { revalidatePath } from 'next/cache';
import { AuditAction, type StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { getPatientTaskById, updatePatientTaskStatus } from '@/lib/medplum/tasks';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';

// A task mutation is bound on BOTH axes the matrix intends for a physio's queue
// (tasks = write, case, "own queue"): the task's patient must be in this
// physiotherapist's case-scope (task.update carries requiresCaseScope) AND the
// task must be owned by their own Practitioner. Without this, a client-supplied
// task id would let a physio complete any task in the system, including another
// clinician's red-flag co-sign.

function extractMedplumPatientId(reference: string | null | undefined): string | null {
  if (!reference) return null;
  const match = reference.match(/^Patient\/(.+)$/);
  return match ? match[1] : null;
}

async function authorizeOwnPhysioTask(
  taskId: string,
): Promise<{ staffId: string; staffRole: StaffRole; patientMedplumId: string; versionId: string | null }> {
  const { user } = await requireStaffCan('workspace.physio.access');
  const task = await getPatientTaskById(taskId);
  if (!task) {
    throw new Error('Task not found.');
  }
  const patientMedplumId = extractMedplumPatientId(task.for?.reference);
  if (!patientMedplumId) {
    throw new Error('This task is not linked to a patient.');
  }
  // Case-scope: the task's patient must be on this physio's care team.
  await requireStaffCan('task.update', { targetPatientMedplumId: patientMedplumId });
  // Own-queue: a physio may only act on tasks owned by their own Practitioner.
  // (Admins/superadmins/med-ops act on behalf, gated by case-scope above.)
  if (user.staffRole === 'physiotherapist') {
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

async function setPhysioTaskStatus(formData: FormData, status: 'in-progress' | 'completed'): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '').trim();
  const expectedVersionId = String(formData.get('expectedVersionId') ?? '').trim() || null;
  if (!taskId) {
    throw new Error('Task id is required.');
  }
  const { staffId, staffRole, patientMedplumId, versionId } = await authorizeOwnPhysioTask(taskId);
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
  revalidatePath('/clinician/tasks');
}

export async function startTaskAction(formData: FormData): Promise<void> {
  await setPhysioTaskStatus(formData, 'in-progress');
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  await setPhysioTaskStatus(formData, 'completed');
}
