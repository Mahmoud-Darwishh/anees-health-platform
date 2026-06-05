'use server';

import { revalidatePath } from 'next/cache';
import { getStaffUser } from '@/lib/auth/rbac';
import { updatePatientTaskStatus } from '@/lib/medplum/tasks';

const PHYSIO_WORKSPACE_ROLES = ['physiotherapist', 'admin', 'superadmin'] as const;

async function assertAccess(): Promise<void> {
  const staff = await getStaffUser([...PHYSIO_WORKSPACE_ROLES]);
  if (!staff?.staffId) {
    throw new Error('Unauthorized');
  }
}

export async function startTaskAction(formData: FormData): Promise<void> {
  await assertAccess();
  const taskId = String(formData.get('taskId') ?? '').trim();
  const expectedVersionId = String(formData.get('expectedVersionId') ?? '').trim() || null;
  if (!taskId) {
    throw new Error('Task id is required.');
  }

  await updatePatientTaskStatus(taskId, 'in-progress', { expectedVersionId });
  revalidatePath('/clinician/tasks');
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  await assertAccess();
  const taskId = String(formData.get('taskId') ?? '').trim();
  const expectedVersionId = String(formData.get('expectedVersionId') ?? '').trim() || null;
  if (!taskId) {
    throw new Error('Task id is required.');
  }

  await updatePatientTaskStatus(taskId, 'completed', { expectedVersionId });
  revalidatePath('/clinician/tasks');
}