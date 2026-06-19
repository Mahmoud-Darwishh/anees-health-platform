import 'server-only';

import type { LicenseType, StaffRole, StaffStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type StaffListItem = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  clinicalLicenseType: LicenseType | null;
  clinicalLicenseNumber: string | null;
  clinicalLicenseExpiry: Date | null;
  licenseIssuingBody: string | null;
  isOnCall: boolean;
  isClinicalDirector: boolean;
  lastLoginAt: Date | null;
  /** True once the staff member has set a password (claimed their account). */
  hasSignedIn: boolean;
  /** True when a clinician role is linked to a Provider (i.e. dispatch-assignable). */
  providerLinked: boolean;
  /** Linked public Doctor profile id, if any (for profile-request publishing). */
  publicDoctorId: number | null;
};

const CLINICIAN_ROLES_FOR_PROVIDER: StaffRole[] = ['doctor', 'nurse', 'physiotherapist'];

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  clinicalLicenseType: true,
  clinicalLicenseNumber: true,
  clinicalLicenseExpiry: true,
  licenseIssuingBody: true,
  isOnCall: true,
  isClinicalDirector: true,
  lastLoginAt: true,
  providerId: true,
  publicDoctorId: true,
} as const;

function toListItem(row: {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  clinicalLicenseType: LicenseType | null;
  clinicalLicenseNumber: string | null;
  clinicalLicenseExpiry: Date | null;
  licenseIssuingBody: string | null;
  isOnCall: boolean;
  isClinicalDirector: boolean;
  lastLoginAt: Date | null;
  providerId: string | null;
  publicDoctorId: number | null;
}): StaffListItem {
  const { providerId, ...rest } = row;
  return {
    ...rest,
    hasSignedIn: row.lastLoginAt !== null,
    // Non-clinician roles don't need a provider link, so they're never "pending".
    providerLinked: CLINICIAN_ROLES_FOR_PROVIDER.includes(row.role) ? providerId !== null : true,
  };
}

/**
 * All staff in the actor's tenant. Tenant-scoped on purpose — an admin manages
 * only their own tenant's roster (cross-tenant management arrives with the
 * hospital/white-label phase).
 */
export async function listStaff(tenantId: string): Promise<StaffListItem[]> {
  const rows = await prisma.staff.findMany({
    where: { tenantId },
    orderBy: [{ status: 'asc' }, { role: 'asc' }, { name: 'asc' }],
    select: STAFF_SELECT,
  });
  return rows.map(toListItem);
}

export type DoctorOption = { id: number; label: string };

/** Active public Doctor profiles, for linking a clinician on the staff form. */
export async function listDoctorOptions(): Promise<DoctorOption[]> {
  const rows = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { nameEn: 'asc' },
    select: { id: true, nameEn: true, slug: true },
    take: 500,
  });
  return rows.map((d) => ({ id: d.id, label: `${d.nameEn} (${d.slug})` }));
}

export async function getStaffMember(id: string, tenantId: string): Promise<StaffListItem | null> {
  const row = await prisma.staff.findFirst({
    where: { id, tenantId },
    select: STAFF_SELECT,
  });
  return row ? toListItem(row) : null;
}
