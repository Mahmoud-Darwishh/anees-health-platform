/**
 * ROLE CONSTANTS — the one home for the staff-role lists.
 * -------------------------------------------------------
 * Pure data, safe to import ANYWHERE — including the Edge runtime (middleware) —
 * because it has no server-only dependencies (only the StaffRole *type*, which is
 * erased at compile time).
 *
 * `rbac.ts` re-exports `CLINICAL_*` from here, so existing
 * `import { CLINICAL_ROLES } from '@/lib/auth/rbac'` keeps working unchanged.
 * `route-access.ts` (Edge) and `policy/ehr-matrix.ts` also read from here, so the
 * same list is never copy-pasted into two files that can drift apart.
 */

import type { StaffRole } from '@prisma/client';

/** Every staff role. The "any authenticated staff" set + reverse-lookup source. */
export const ALL_STAFF_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'medical_ops',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
  'insurance_coordinator',
  'compliance_officer',
  'hospital_partner_admin',
  'finance',
  'viewer',
];

/** Staff roles allowed to read clinical/admin data. */
export const CLINICAL_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
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
  'medical_ops',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

/**
 * Roles allowed to READ the clinical chart. Adds `compliance_officer` to the
 * clinical roles: the role matrix (`policy/ehr-matrix.ts`) grants Compliance
 * `read / global` on every clinical module (audit + oversight, separation of
 * duties), but they hold NO write role, so every mutation stays gated. Use this
 * for read entry points (patient list/detail loaders, document streaming);
 * keep writes on `CLINICAL_WRITE_ROLES`.
 */
export const CLINICAL_READ_ROLES: StaffRole[] = [...CLINICAL_ROLES, 'compliance_officer'];

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
