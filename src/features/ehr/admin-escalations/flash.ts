import 'server-only';

import { cookies } from 'next/headers';
import { ADMIN_ESCALATIONS_FLASH_COOKIE } from './constants';
import type { AdminEscalationsFlash } from './types';

export async function setAdminEscalationsFlash(flash: AdminEscalationsFlash): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ESCALATIONS_FLASH_COOKIE, JSON.stringify(flash), {
    path: '/admin',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 120,
  });
}

export async function consumeAdminEscalationsFlash(): Promise<AdminEscalationsFlash | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_ESCALATIONS_FLASH_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminEscalationsFlash;
    if (!parsed?.type || !parsed?.message) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
