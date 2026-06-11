import type { StaffRole } from '@prisma/client';
import { canAccessRoute } from '@/lib/auth/route-access';

export type AdminNavItem = {
  /** The link target. Also the primary "is this section active?" prefix. */
  href: string;
  /** Short pill label. */
  label: string;
  /** One-line explanation — used as the link tooltip + accessible hint. */
  description: string;
  /**
   * Extra path prefixes that should also mark this item active. Used when a
   * section's gateway URL differs from where the user actually ends up (e.g.
   * `/admin/clinician` forwards into the `/clinician/*` workspace).
   */
  matchPrefixes?: string[];
};

/**
 * The admin nav links. Visibility is NOT defined here — it is derived from
 * `route-access.ts` (the single source for "who may enter this URL"). That keeps
 * the menu and the edge gate in perfect sync: a link only shows if the role is
 * actually allowed into that section.
 */
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: '/admin/patients',
    label: 'Patients',
    description: 'Patient records, clinical detail, and case files.',
  },
  {
    href: '/admin/escalations',
    label: 'Escalations',
    description: 'Open clinical escalations and red-flag alerts.',
  },
  {
    href: '/admin/clinician',
    label: 'Clinician',
    description: 'Open the field-clinician (physiotherapy) workspace.',
    matchPrefixes: ['/clinician'],
  },
  {
    href: '/admin/ops',
    label: 'Ops',
    description: 'Visit dispatch, shift oversight, and disputes.',
  },
  {
    href: '/admin/insurance',
    label: 'Insurance',
    description: 'Insurers, coverage, prior-authorisation, and claims.',
  },
  {
    href: '/admin/compliance',
    label: 'Compliance',
    description: 'Audit log, break-glass overrides, and access events.',
  },
  {
    href: '/admin/nursing/dashboard',
    label: 'Nurse Dashboard',
    description: 'Nursing-operations dashboard and shift metrics.',
  },
];

export function getAdminNavItems(staffRole: StaffRole | null | undefined): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => canAccessRoute(item.href, staffRole ?? null));
}

/**
 * True if `pathname` falls inside the section a nav item represents. Matches the
 * item's own `href` plus any declared `matchPrefixes`, treating each as a path
 * prefix (so `/admin/patients/123` still highlights "Patients").
 */
export function isAdminNavItemActive(item: AdminNavItem, pathname: string): boolean {
  const targets = [item.href, ...(item.matchPrefixes ?? [])];
  return targets.some((target) => pathname === target || pathname.startsWith(`${target}/`));
}
