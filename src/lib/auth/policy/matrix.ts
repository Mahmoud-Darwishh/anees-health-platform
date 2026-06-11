/**
 * MATRIX LOOKUP
 * -------------
 * Thin bridge between an ACTION (a thing the code does) and the readable GRID
 * (`ehr-matrix.ts`, which holds the per-role permissions). The grid is the
 * single source of truth; this file just answers "is this role allowed this
 * action?" by looking up the action's module + required level in the grid.
 *
 * To change WHO can do something, edit `ehr-matrix.ts` — never this file.
 */

import type { StaffRole } from '@prisma/client';
import { ACTIONS, type ActionName } from './actions';
import { ALL_STAFF_ROLES, cellForRole, meetsCapability } from './ehr-matrix';

/**
 * The one lookup. True if `role` is granted `action`, by checking the role's
 * level in the action's module against the level the action requires. Deny by
 * default — an unknown action or a `hidden` cell both return false.
 */
export function roleAllowsAction(role: StaffRole, action: ActionName): boolean {
  const def = ACTIONS[action];
  if (!def) {
    return false;
  }
  const cell = cellForRole(def.module, role);
  return meetsCapability(cell.level, def.requires);
}

/**
 * Reverse lookup: every role that is granted `action`. Useful where existing
 * code needs a role list (e.g. `getStaffUser([...])`) derived from the grid
 * instead of hand-copied into many files.
 */
export function rolesWithAction(action: ActionName): StaffRole[] {
  return ALL_STAFF_ROLES.filter((role) => roleAllowsAction(role, action));
}
