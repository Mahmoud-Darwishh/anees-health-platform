import 'server-only';

import { auth } from '@/auth';
import type { StaffRole } from '@prisma/client';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: 'patient' | 'staff';
  patientId?: string | null;
  staffId?: string | null;
  staffRole?: StaffRole | null;
  phone?: string | null;
};

/** Staff roles allowed to read clinical/admin data. */
export const CLINICAL_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

/** Staff roles allowed to write clinical data. */
export const CLINICAL_WRITE_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'doctor',
  'physiotherapist',
  'nurse',
];

/**
 * Roles that must be scoped to assigned care-team patients for clinical reads.
 * Admin and superadmin are intentionally excluded.
 */
export const CASE_SCOPED_CLINICAL_READ_ROLES: StaffRole[] = [
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

export function isCaseScopedClinicalRole(role?: StaffRole | null): boolean {
  return !!role && CASE_SCOPED_CLINICAL_READ_ROLES.includes(role);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

/** True when the user is authenticated staff. */
export function isStaff(user: SessionUser | null): user is SessionUser {
  return !!user?.staffId;
}

/** True when staff and their role is in the allowed set. */
export function staffHasRole(user: SessionUser | null, roles: StaffRole[]): boolean {
  return isStaff(user) && !!user.staffRole && roles.includes(user.staffRole);
}

/**
 * Returns the staff user if authenticated AND holding one of `roles`
 * (defaults to any clinical role); otherwise null. For use in route
 * handlers and server components to gate access.
 */
export async function getStaffUser(roles: StaffRole[] = CLINICAL_ROLES): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return staffHasRole(user, roles) ? user : null;
}

/** Returns the patient user (with patientId) if authenticated as a patient; else null. */
export async function getPatientUser(): Promise<(SessionUser & { patientId: string }) | null> {
  const user = await getSessionUser();
  if (user?.role === 'patient' && user.patientId) {
    return user as SessionUser & { patientId: string };
  }
  return null;
}
