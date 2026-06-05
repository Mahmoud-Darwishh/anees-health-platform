'use server';

import { revalidatePath } from 'next/cache';
import { AuditAction, type StaffRole } from '@prisma/client';
import { ZodError } from 'zod';
import { getStaffUser } from '@/lib/auth/rbac';
import { updatePatientTaskStatus } from '@/lib/medplum/tasks';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { escalationFormDataToInput, updateEscalationStatusSchema } from '@/features/ehr/schemas/admin-escalations-actions';
import { setAdminEscalationsFlash } from './flash';

const COORDINATION_WRITE_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'medical_ops',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
  'finance',
];

function parseActionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Invalid form input.';
  }
  return error instanceof Error ? error.message : 'Unexpected error. Please try again.';
}

function extractPatientId(reference?: string): string | null {
  if (!reference) {
    return null;
  }

  const parts = reference.split('/');
  const id = parts[parts.length - 1]?.trim();
  return id || null;
}

export async function updateEscalationStatusAction(formData: FormData): Promise<void> {
  try {
    const staff = await getStaffUser(COORDINATION_WRITE_ROLES);
    if (!staff?.staffId) {
      throw new Error('Unauthorized');
    }

    const input = updateEscalationStatusSchema.parse(escalationFormDataToInput(formData));

    const updatedTask = await updatePatientTaskStatus(input.taskId, input.nextStatus, {
      expectedVersionId: input.taskVersionId,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumEscalationTask',
      recordId: updatedTask.id ?? input.taskId,
      action: AuditAction.update,
      changedFields: ['status'],
      changedBy: staff.staffId,
    });

    await setAdminEscalationsFlash({
      type: 'success',
      message: 'Escalation status updated.',
    });

    const medplumPatientId =
      input.medplumPatientId ?? extractPatientId(updatedTask.for?.reference);

    revalidatePath('/admin/escalations');
    if (medplumPatientId) {
      revalidatePath(`/admin/patients/${medplumPatientId}`);
      revalidatePath('/en/portal');
      revalidatePath('/ar/portal');
    }
  } catch (error) {
    await setAdminEscalationsFlash({
      type: 'error',
      message: parseActionError(error),
    });
    revalidatePath('/admin/escalations');
  }
}
