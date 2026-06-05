import 'server-only';

import { auth } from '@/auth';
import type { LicenseType, StaffRole } from '@prisma/client';

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

export type ClinicalDiscipline = 'nursing' | 'physiotherapy' | 'medical';

export type StaffLicenseSnapshot = {
  staffRole?: StaffRole | null;
  clinicalLicenseType?: LicenseType | null;
  clinicalLicenseNumber?: string | null;
  clinicalLicenseExpiry?: Date | string | null;
};

const MEDICAL_OPS_COMPAT_ROLES: StaffRole[] = ['medical_ops', 'operator'];

/** Staff roles allowed to read clinical/admin data. */
export const CLINICAL_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'finance',
  'medical_ops',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

/** Staff roles allowed to write clinical data. */
export const CLINICAL_WRITE_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'finance',
  'doctor',
  'physiotherapist',
  'nurse',
];

/**
 * Roles that must be scoped to assigned care-team patients for clinical reads.
 * Admin and superadmin are intentionally excluded.
 */
export const CASE_SCOPED_CLINICAL_READ_ROLES: StaffRole[] = [
  'medical_ops',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

export function isCaseScopedClinicalRole(role?: StaffRole | null): boolean {
  return !!role && CASE_SCOPED_CLINICAL_READ_ROLES.includes(role);
}

export function isLicensedMedOps(staff: StaffLicenseSnapshot, at: Date = new Date()): boolean {
  if (!staff.staffRole || !MEDICAL_OPS_COMPAT_ROLES.includes(staff.staffRole)) {
    return false;
  }

  if (!staff.clinicalLicenseType || staff.clinicalLicenseType === 'none') {
    return false;
  }

  if (!staff.clinicalLicenseNumber?.trim()) {
    return false;
  }

  if (!staff.clinicalLicenseExpiry) {
    return false;
  }

  const expiry = new Date(staff.clinicalLicenseExpiry);
  if (Number.isNaN(expiry.getTime())) {
    return false;
  }

  return expiry.getTime() >= at.getTime();
}

export function canSignClinical(
  staff: StaffLicenseSnapshot,
  discipline: ClinicalDiscipline,
  at: Date = new Date(),
): boolean {
  const role = staff.staffRole;
  if (!role) {
    return false;
  }

  if (role === 'superadmin' || role === 'admin') {
    return true;
  }

  if (role === 'finance') {
    return true;
  }

  if (role === 'doctor') {
    return discipline === 'medical';
  }

  if (role === 'nurse') {
    return discipline === 'nursing';
  }

  if (role === 'physiotherapist') {
    return discipline === 'physiotherapy';
  }

  if (!isLicensedMedOps(staff, at)) {
    return false;
  }

  return (
    (discipline === 'medical' && staff.clinicalLicenseType === 'medical_syndicate') ||
    (discipline === 'nursing' && staff.clinicalLicenseType === 'nursing_syndicate') ||
    (discipline === 'physiotherapy' && staff.clinicalLicenseType === 'physiotherapy_syndicate')
  );
}

export function isRestrictedTierEligibleRole(role?: StaffRole | null): boolean {
  if (!role) {
    return false;
  }

  return [
    'superadmin',
    'admin',
    'compliance_officer',
    'medical_ops',
    'operator',
    'doctor',
    'physiotherapist',
    'nurse',
  ].includes(role);
}

export async function isRestrictedTierEligible(user: SessionUser | null, _patientId: string): Promise<boolean> {
  return isStaff(user) && isRestrictedTierEligibleRole(user.staffRole ?? null);
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
