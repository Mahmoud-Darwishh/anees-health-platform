import 'server-only';

import { cookies } from 'next/headers';
import { ADMIN_PATIENT_FLASH_COOKIE } from './constants';
import type { AdminPatientFlash } from './types';

export async function setAdminPatientFlash(flash: AdminPatientFlash): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_PATIENT_FLASH_COOKIE, JSON.stringify(flash), {
    path: '/admin',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 120,
  });
}

export async function consumeAdminPatientFlash(): Promise<AdminPatientFlash | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_PATIENT_FLASH_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminPatientFlash;
    if (!parsed?.type || !parsed?.message) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
