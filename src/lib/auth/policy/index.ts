/**
 * Anees authorization policy — public surface.
 *
 * The mental model (5 small pieces):
 *   ehr-matrix.ts — THE READABLE GRID: each role × module → what they may do.
 *                   This is the human-editable single source of truth.
 *   actions.ts    — maps each named action onto a module + required level.
 *   matrix.ts     — looks an action up in the grid (allow / deny).
 *   can.ts        — the decision: one pure function, runs the rules.
 *   enforce.ts    — the gate: what server actions / routes actually call.
 *
 * Import the pure pieces from here. Import the server-only gate directly from
 * '@/lib/auth/policy/enforce' (kept separate so this index stays testable).
 *
 * Full design + phased roadmap: docs/RBAC_ARCHITECTURE_PLAN.md
 * Human policy of record: docs/EHR_ROLE_MATRIX.md §3
 */

export {
  EHR_MATRIX,
  cellForRole,
  permissionsForRole,
  meetsCapability,
  ALL_STAFF_ROLES,
  type Capability,
  type AccessScope,
  type AccessCell,
  type ModuleKey,
} from './ehr-matrix';
export { ACTIONS, type ActionName, type ActionDefinition } from './actions';
export { roleAllowsAction, rolesWithAction } from './matrix';
export { can, type StaffActor, type DecisionContext, type Decision } from './can';
export { type PolicyInputContext, type StaffPolicySession } from './pip';
