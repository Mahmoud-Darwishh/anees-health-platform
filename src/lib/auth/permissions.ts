import type { StaffRole } from '@prisma/client';

export type AppPermission =
  | 'patients.read'
  | 'patients.write'
  | 'clinical.read'
  | 'clinical.write'
  | 'audit.read'
  | 'billing.read'
  | 'billing.write'
  | 'admin.manage';

const ROLE_PERMISSIONS: Record<StaffRole, AppPermission[]> = {
  superadmin: [
    'patients.read',
    'patients.write',
    'clinical.read',
    'clinical.write',
    'audit.read',
    'billing.read',
    'billing.write',
    'admin.manage',
  ],
  admin: [
    'patients.read',
    'patients.write',
    'clinical.read',
    'clinical.write',
    'audit.read',
    'billing.read',
  ],
  operator: ['patients.read', 'patients.write', 'clinical.read', 'clinical.write'],
  finance: ['patients.read', 'billing.read', 'billing.write'],
  viewer: ['patients.read', 'clinical.read'],
};

export function hasPermission(role: StaffRole | null | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessAdminPath(role: StaffRole | null | undefined, path: string): boolean {
  if (!role) return false;

  if (path.startsWith('/admin/audit-logs')) {
    return hasPermission(role, 'audit.read');
  }

  if (path.startsWith('/admin/patients')) {
    return hasPermission(role, 'patients.read');
  }

  return true;
}
