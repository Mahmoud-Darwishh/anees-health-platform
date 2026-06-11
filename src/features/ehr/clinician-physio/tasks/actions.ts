'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { updatePatientTaskStatus } from '@/lib/medplum/tasks';

async function assertAccess(): Promise<void> {
  await requireStaffCan('workspace.physio.access');
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