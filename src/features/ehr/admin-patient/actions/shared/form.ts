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

export async function failAction(
  formData: FormData,
  error: unknown,
  opts?: { rethrow?: boolean },
): Promise<void> {
  const medplumPatientId = getPatientIdFromFormData(formData);
  await setAdminPatientFlash({ type: 'error', message: parseActionError(error) });
  if (medplumPatientId) {
    refreshClinicalPaths(medplumPatientId);
  }
  // Clinician field wrappers pass { rethrow: true } (or stamp a `__rethrow`
  // marker on the trusted FormData) so a real write failure propagates to their
  // useActionState form (which renders the error inline) instead of only landing
  // in the /admin flash cookie the field clinician never sees. The admin chart
  // pages call failAction without opts and never set the marker → behaviour
  // unchanged.
  const shouldRethrow = opts?.rethrow === true || formData.get('__rethrow') === '1';
  if (shouldRethrow) {
    throw error;
  }
}
