import 'server-only';

import type { StaffRole } from '@prisma/client';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { getPractitionerAvailability, type PractitionerAvailability } from '@/lib/medplum/availability';

const DISPATCHABLE_ROLES: StaffRole[] = ['doctor', 'nurse', 'physiotherapist'];

/** The roles that may declare dispatch availability (the field/visit disciplines). */
export function canManageAvailability(role: StaffRole | null | undefined): boolean {
  return !!role && DISPATCHABLE_ROLES.includes(role);
}

/**
 * Resolve the signed-in clinician's Medplum practitioner reference. Throws for a
 * non-clinician. Shared by the read loader and the write action so both agree on
 * who the availability belongs to (never trusted from the client).
 */
export async function resolveMyPractitionerReference(): Promise<{ reference: string; display: string | null }> {
  const user = await getSessionUser();
  if (!isStaff(user) || !user.staffId || !user.staffRole) {
    throw new Error('Unauthorized');
  }
  if (!canManageAvailability(user.staffRole)) {
    throw new Error('Only field clinicians can set availability.');
  }

  const staff = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!staff) {
    throw new Error('Could not find your staff profile.');
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staff.id,
    name: staff.name ?? staff.email ?? `Staff ${staff.id}`,
    email: staff.email,
    role: staff.role,
  });

  return { reference: practitioner.reference, display: practitioner.display ?? staff.name };
}

export async function getMyAvailability(): Promise<PractitionerAvailability> {
  const { reference } = await resolveMyPractitionerReference();
  return getPractitionerAvailability(reference);
}
