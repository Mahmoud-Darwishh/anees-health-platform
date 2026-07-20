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
  /**
   * When true, this is an EXTERNAL link (a separate app, e.g. Metabase). It
   * opens in a new tab and is never highlighted as the active section. External
   * items are NOT gated by `canAccessRoute` (that only governs internal
   * `/admin/*` routes) — they carry their own role gate where they are added.
   */
  external?: boolean;
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
    href: '/admin/billing',
    label: 'Billing',
    description: 'Confirm InstaPay transfers and export delivered visits.',
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    description: 'Revenue, bookings funnel, visits, and clinician utilization.',
  },
  {
    href: '/admin/staff',
    label: 'Staff',
    description: 'Onboard staff, assign roles + licences, and issue access links.',
  },
  {
    href: '/admin/notifications',
    label: 'Notifications',
    description: 'Send PHI-light app alerts to opted-in users.',
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
  {
    href: '/admin/access',
    label: 'My Access',
    description: 'Your effective permissions, derived live from the role matrix.',
  },
];

/**
 * Roles that may see the external Metabase (BI) link. Mirrors the
 * `/admin/analytics` audience exactly — the same people who see in-app KPIs.
 */
const METABASE_AUDIENCE: StaffRole[] = ['superadmin', 'admin', 'finance', 'medical_ops', 'operator'];

export function getAdminNavItems(staffRole: StaffRole | null | undefined): AdminNavItem[] {
  const items = ADMIN_NAV_ITEMS.filter((item) => canAccessRoute(item.href, staffRole ?? null));

  // External BI (Metabase). Shown ONLY once it is actually configured
  // (`NEXT_PUBLIC_METABASE_URL` is set) AND the role is in the analytics
  // audience — so the link never dangles before Metabase exists, and never
  // leaks to a role that shouldn't see business analytics. It's an external URL,
  // so it is gated by this explicit role list rather than by `canAccessRoute`.
  const metabaseUrl = process.env.NEXT_PUBLIC_METABASE_URL?.trim();
  if (metabaseUrl && staffRole && METABASE_AUDIENCE.includes(staffRole)) {
    items.push({
      href: metabaseUrl,
      label: 'Metabase',
      description: 'Self-serve dashboards and trends — opens the Metabase analytics app.',
      external: true,
    });
  }

  return items;
}

/**
 * True if `pathname` falls inside the section a nav item represents. Matches the
 * item's own `href` plus any declared `matchPrefixes`, treating each as a path
 * prefix (so `/admin/patients/123` still highlights "Patients").
 */
export function isAdminNavItemActive(item: AdminNavItem, pathname: string): boolean {
  // External links (e.g. Metabase) are a different app — never the "current" section.
  if (item.external) return false;
  const targets = [item.href, ...(item.matchPrefixes ?? [])];
  return targets.some((target) => pathname === target || pathname.startsWith(`${target}/`));
}
