import 'server-only';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { setAdminPatientFlash } from '../../flash';

export function refreshClinicalPaths(medplumPatientId: string) {
  revalidatePath(`/admin/patients/${medplumPatientId}`);
  revalidatePath('/en/portal');
  revalidatePath('/ar/portal');
}

export function getPatientIdFromFormData(formData: FormData): string {
  return String(formData.get('medplumPatientId') ?? '').trim();
}

export function parseActionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Invalid form input.';
  }
  return error instanceof Error ? error.message : 'Unexpected error. Please try again.';
}

export async function failAction(formData: FormData, error: unknown): Promise<void> {
  const medplumPatientId = getPatientIdFromFormData(formData);
  await setAdminPatientFlash({ type: 'error', message: parseActionError(error) });
  if (medplumPatientId) {
    refreshClinicalPaths(medplumPatientId);
  }
}
