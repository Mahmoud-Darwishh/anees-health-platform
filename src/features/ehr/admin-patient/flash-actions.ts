'use server';

import { cookies } from 'next/headers';
import { ADMIN_PATIENT_FLASH_COOKIE } from './constants';

/**
 * Clear the one-shot flash cookie. The cookie is set inside server actions and
 * read during render (where cookies cannot be mutated), so the toast calls this
 * on mount to ensure a status message can never reappear on a later navigation.
 */
export async function dismissAdminPatientFlashAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_PATIENT_FLASH_COOKIE);
}
