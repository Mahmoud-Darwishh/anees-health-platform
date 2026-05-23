import type { StaffRole } from '@prisma/client';

export type AppPermission =
  | 'patients.read'
  | 'patients.write'
  | 'clinical.read'
  | 'clinical.write'
  | 'physio.write'
  | 'physio.financial.read'
  | 'physio.attendance.write'
  | 'nursing.write'
  | 'messaging.write'
  | 'call-routing.write'
  | 'ai-triage.write'
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
    'physio.write',
    'nursing.write',
    'messaging.write',
    'call-routing.write',
    'ai-triage.write',
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
    'physio.write',
    'nursing.write',
    'messaging.write',
    'call-routing.write',
    'ai-triage.write',
    'audit.read',
    'billing.read',
  ],
  operator: ['patients.read', 'patients.write', 'clinical.read', 'messaging.write', 'call-routing.write'],
  doctor: ['patients.read', 'clinical.read', 'clinical.write', 'messaging.write', 'ai-triage.write'],
  physiotherapist: [
    'patients.read',
    'clinical.read',
    'physio.write',
    'physio.financial.read',
    'physio.attendance.write',
    'messaging.write',
  ],
  nurse: ['patients.read', 'clinical.read', 'nursing.write', 'messaging.write'],
  finance: ['patients.read', 'billing.read', 'billing.write'],
  viewer: ['patients.read', 'clinical.read'],
};

export function hasPermission(role: StaffRole | null | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessAdminPath(role: StaffRole | null | undefined, path: string): boolean {
  if (!role) return false;

  if (path === '/admin/physio' || path.startsWith('/admin/physio/')) {
    return role === 'physiotherapist';
  }

  if (path === '/admin/dashboards/physio' || path.startsWith('/admin/dashboards/physio/')) {
    return role === 'physiotherapist';
  }

  if (role === 'physiotherapist') {
    return (
      path === '/admin/patients'
      || path.startsWith('/admin/patients/')
    );
  }

  if (path.startsWith('/admin/audit-logs')) {
    return hasPermission(role, 'audit.read');
  }

  if (path.startsWith('/admin/patients')) {
    return hasPermission(role, 'patients.read');
  }

  return true;
}

export function getAdminHomePath(role: StaffRole | null | undefined): string {
  if (!role) return '/admin/login';
  if (role === 'physiotherapist') return '/admin/physio';
  if (hasPermission(role, 'patients.read')) return '/admin/patients';
  return '/admin/login';
}
