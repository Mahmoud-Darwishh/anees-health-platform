import type { StaffRole } from '@prisma/client';

export type AdminNavItem = {
  href: string;
  label: string;
};

type AdminNavPolicyItem = AdminNavItem & {
  allowedRoles?: StaffRole[];
};

const ADMIN_NAV_POLICY: AdminNavPolicyItem[] = [
  { href: '/admin/patients', label: 'Patients' },
  { href: '/admin/escalations', label: 'Escalations' },
  {
    href: '/admin/clinician',
    label: 'Clinician',
    allowedRoles: ['doctor', 'physiotherapist', 'nurse', 'medical_ops', 'operator', 'admin', 'superadmin'],
  },
  {
    href: '/admin/ops',
    label: 'Ops',
    allowedRoles: ['medical_ops', 'operator', 'admin', 'superadmin'],
  },
  {
    href: '/admin/insurance',
    label: 'Insurance',
    allowedRoles: ['insurance_coordinator', 'admin', 'superadmin'],
  },
  {
    href: '/admin/compliance',
    label: 'Compliance',
    allowedRoles: ['compliance_officer', 'admin', 'superadmin'],
  },
  {
    href: '/admin/nursing/dashboard',
    label: 'Nurse Dashboard',
    allowedRoles: ['nurse', 'admin', 'superadmin'],
  },
];

export function getAdminNavItems(staffRole: StaffRole | null | undefined): AdminNavItem[] {
  return ADMIN_NAV_POLICY.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) {
      return true;
    }

    return !!staffRole && item.allowedRoles.includes(staffRole);
  }).map(({ href, label }) => ({ href, label }));
}
