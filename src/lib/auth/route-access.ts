/**
 * SECTION ACCESS — which roles may ENTER each URL family.
 * -------------------------------------------------------
 * This is the coarse "front door" gate: can this person open this section of the
 * app at all? It is the SINGLE source used by BOTH:
 *   • the edge gate in `src/proxy.ts` (blocks the wrong role at the URL), and
 *   • the admin nav (`admin-nav-policy.ts`) so people only see links they can use.
 *
 * It is defence in depth, NOT the only check: every page and data loader still
 * runs its own precise guard. Keep each list in sync with the page/loader it
 * mirrors.
 *
 * IMPORTANT: this file runs in the Edge runtime (middleware), so it imports only
 * the StaffRole *type* — nothing server-only (no DB, no NextAuth, no Medplum).
 */

import type { StaffRole } from '@prisma/client';
import { ALL_STAFF_ROLES, CLINICAL_READ_ROLES } from './role-constants';

type RouteRule = {
  prefix: string;
  roles: StaffRole[];
  /**
   * When true, the rule matches ONLY the exact path (`pathname === prefix`), not
   * descendants. Used for shared "front-door" pages (the `/admin` dispatcher and
   * the `/admin/no-workspace` landing) that every authenticated staff member may
   * reach — without that exact rule turning `/admin` into a wildcard that would
   * silently re-open every unlisted child route.
   */
  exact?: boolean;
};

/**
 * URL family → roles allowed in. Each list mirrors that section's page/loader
 * guard exactly. Order does not matter (prefixes are disjoint), but keep the
 * most specific path's rule present if you ever add overlapping prefixes.
 */
const ROUTE_RULES: RouteRule[] = [
  // ── Shared staff entries (exact match only) ──────────────────────────────
  // The dispatcher resolves the role then forwards to its home; the landing is
  // the dead-end for roles with no workspace yet. Both must be reachable by ANY
  // authenticated staff member, but ONLY at their exact path.
  { prefix: '/admin', roles: ALL_STAFF_ROLES, exact: true },
  { prefix: '/admin/no-workspace', roles: ALL_STAFF_ROLES, exact: true },
  // Every authenticated staff member may view their own effective permissions.
  { prefix: '/admin/access', roles: ALL_STAFF_ROLES },

  // ── Section families (prefix match) ──────────────────────────────────────
  // Staff / user management — onboarding clinicians, assigning roles + licences.
  // Admin + superadmin only (the `staff_user_mgmt` matrix module grants admin
  // `sign`); compliance has matrix READ but no dedicated screen, by design.
  { prefix: '/admin/staff', roles: ['superadmin', 'admin'] },
  { prefix: '/admin/compliance', roles: ['superadmin', 'admin', 'compliance_officer'] },
  { prefix: '/admin/insurance', roles: ['superadmin', 'admin', 'insurance_coordinator', 'finance'] },
  // Payments + reconciliation (InstaPay confirm queue, delivered-visits export).
  // Owner decision: operations OR finance may confirm transfers.
  { prefix: '/admin/billing', roles: ['superadmin', 'admin', 'finance', 'medical_ops', 'operator'] },
  // Business analytics / owner KPIs (aggregate, no PHI drill-down).
  { prefix: '/admin/analytics', roles: ['superadmin', 'admin', 'finance', 'medical_ops', 'operator'] },
  { prefix: '/admin/ops', roles: ['superadmin', 'admin', 'medical_ops', 'operator'] },
  { prefix: '/admin/nursing', roles: ['superadmin', 'admin', 'nurse'] },
  // The clinician workspace gateway mirrors the `/clinician` app gate exactly —
  // only roles that can actually open the workspace see/enter it. Keeping these
  // two lists identical prevents the post-login "allowed here, blocked there"
  // redirect bounce that other clinical roles used to hit.
  { prefix: '/admin/clinician', roles: ['superadmin', 'admin', 'physiotherapist'] },
  // Compliance-officer is included for READ (oversight + audit, separation of
  // duties). They hold no write role, so every mutation stays gated downstream.
  { prefix: '/admin/escalations', roles: CLINICAL_READ_ROLES },
  { prefix: '/admin/patients', roles: CLINICAL_READ_ROLES },
  // Field-clinician workspace. Physio, nurse, and doctor each have a discipline
  // workspace here; the layout + each page self-guard on the discipline-specific
  // matrix action (`workspace.physio.access` / `.nursing.access` / `.doctor.access`).
  { prefix: '/clinician', roles: ['superadmin', 'admin', 'physiotherapist', 'nurse', 'doctor'] },
];

/**
 * The roles allowed for a path.
 *
 * DENY BY DEFAULT: an unlisted staff route (`/admin/*` or `/clinician/*` with no
 * matching rule) returns an EMPTY set — i.e. no role may enter it — so a new page
 * shipped without a route rule fails CLOSED, not open. Add a `ROUTE_RULES` entry
 * (and a matching page guard) to open a new section.
 *
 * Exact-match rules are checked first so the shared `/admin` dispatcher and the
 * `/admin/no-workspace` landing stay reachable without becoming a wildcard that
 * would shadow (and silently re-open) every child route beneath them.
 */
export function rolesForRoute(pathname: string): StaffRole[] {
  const exactMatch = ROUTE_RULES.find((rule) => rule.exact && rule.prefix === pathname);
  if (exactMatch) {
    return exactMatch.roles;
  }

  const prefixMatch = ROUTE_RULES.find(
    (rule) => !rule.exact && (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)),
  );
  return prefixMatch ? prefixMatch.roles : [];
}

/** True if `role` may enter `pathname`. Missing role = denied. */
export function canAccessRoute(pathname: string, role: StaffRole | null | undefined): boolean {
  return !!role && rolesForRoute(pathname).includes(role);
}

/**
 * Where to send a staff member who hit a section they cannot enter. Each target
 * is guaranteed to be allowed for that role, so there are no redirect loops.
 */
const ROLE_HOME: Record<StaffRole, string> = {
  superadmin: '/admin/patients',
  admin: '/admin/patients',
  finance: '/admin/insurance',
  // Doctors land in their review/sign workspace (case worklist + co-sign queue).
  // The full chart at /admin/patients remains reachable for signing.
  doctor: '/clinician/doctor',
  // Physiotherapists live in the field-clinician app, not the admin console.
  physiotherapist: '/clinician/today',
  // Nurses land in their field workspace (today's visits). The nurse-ops
  // dashboard at /admin/nursing/dashboard remains reachable for oversight.
  nurse: '/clinician/nursing/today',
  medical_ops: '/admin/ops',
  operator: '/admin/ops',
  insurance_coordinator: '/admin/insurance',
  compliance_officer: '/admin/compliance',
  // No staff-facing section is built for these roles yet. Land them on a clear
  // in-app "no workspace assigned" page rather than bouncing them to the public
  // marketing site.
  hospital_partner_admin: '/admin/no-workspace',
  viewer: '/admin/no-workspace',
};

export function homeRouteForRole(role: StaffRole | null | undefined): string {
  return role ? ROLE_HOME[role] : '/en';
}
