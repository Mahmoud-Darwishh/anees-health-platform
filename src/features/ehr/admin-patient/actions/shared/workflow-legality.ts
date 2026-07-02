import type { WorkflowStateValue } from './workflow-state';

/**
 * VISIT STATE MACHINE — SINGLE LEGALITY MAP (B15).
 * ------------------------------------------------
 * Every allowed `from → to` transition is declared here, once. This is the law:
 * no screen, server action, or override may move a visit outside this map. It is
 * enforced server-side inside `persistWorkflowStateTransition` (the single choke
 * point through which every state write passes) and is unit-tested.
 *
 * Why this exists: the journey steps previously used ad-hoc timestamp guards and
 * the disruption transitions had *zero* sequence guards — so a `completed` visit
 * could be re-marked `refused_at_door` and have its money rewritten. Closed
 * (terminal) states now accept no transition except raising/resolving a dispute.
 *
 * `null` represents a legacy row with no persisted `state`; the transaction
 * derives a concrete state before calling in, so `null` never reaches the check.
 */
export const ALLOWED_TRANSITIONS: Record<WorkflowStateValue, readonly WorkflowStateValue[]> = {
  // Journey — the happy path plus the disruptions reachable from each active step.
  scheduled: [
    'acknowledged',
    'declined_by_physio',
    'reassigned_to_other_physio',
    'cancelled_by_patient',
    'cancelled_by_med_ops',
    'rescheduled_in_place',
    'diverted_in_transit',
  ],
  acknowledged: [
    'en_route',
    'declined_by_physio',
    'reassigned_to_other_physio',
    'cancelled_by_patient',
    'cancelled_by_med_ops',
    'rescheduled_in_place',
    'diverted_in_transit',
  ],
  en_route: [
    'arrived',
    'diverted_in_transit',
    'patient_not_home',
    'reassigned_to_other_physio',
    'cancelled_by_patient',
    'cancelled_by_med_ops',
    'rescheduled_in_place',
  ],
  arrived: [
    'checked_in',
    'refused_at_door',
    'patient_not_home',
    'reassigned_to_other_physio',
    'cancelled_by_patient',
    'cancelled_by_med_ops',
    'rescheduled_in_place',
  ],
  checked_in: ['checked_out', 'session_interrupted', 'rescheduled_in_place'],
  session_interrupted: ['checked_in', 'checked_out', 'rescheduled_in_place'],

  // End-of-visit. `checked_out` carries status=completed; disputes may still be raised.
  checked_out: ['completed', 'disputed'],
  completed: ['disputed'],
  // A dispute is resolved by upholding the visit (→ completed/checked_out) or by
  // an admin force-closing it (→ force_closed_by_admin), the terminal outcome for
  // a refunded/abandoned dispute. force_closed_by_admin accepts no further moves.
  disputed: ['completed', 'checked_out', 'force_closed_by_admin'],
  force_closed_by_admin: [],

  // Rescheduled/diverted/reassigned visits can re-enter the active journey.
  rescheduled_in_place: [
    'scheduled',
    'acknowledged',
    'en_route',
    'reassigned_to_other_physio',
    'cancelled_by_patient',
    'cancelled_by_med_ops',
  ],
  diverted_in_transit: [
    'scheduled',
    'acknowledged',
    'reassigned_to_other_physio',
    'cancelled_by_med_ops',
    'rescheduled_in_place',
  ],
  reassigned_to_other_physio: ['scheduled', 'acknowledged'],

  // Terminal / closed — no further movement (money and attendance are settled).
  declined_by_physio: [],
  cancelled_by_patient: [],
  cancelled_by_med_ops: [],
  refused_at_door: [],
  patient_not_home: [],
  cancelled: [],
  no_show: [],
};

/** Closed states whose money + attendance are settled; only disputes escape them. */
export const CLOSED_WORKFLOW_STATES: ReadonlySet<WorkflowStateValue> = new Set<WorkflowStateValue>([
  'declined_by_physio',
  'cancelled_by_patient',
  'cancelled_by_med_ops',
  'refused_at_door',
  'patient_not_home',
  'cancelled',
  'no_show',
  'completed',
  'force_closed_by_admin',
]);

/** Pure predicate: is moving `from → to` permitted by the state machine? */
export function isLegalTransition(from: WorkflowStateValue, to: WorkflowStateValue): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/** Throw a clear, user-facing error when a transition is not on the map. */
export function assertLegalTransition(from: WorkflowStateValue, to: WorkflowStateValue): void {
  if (from === to) {
    throw new Error(`Visit is already "${from}". No change was applied.`);
  }
  if (!isLegalTransition(from, to)) {
    throw new Error(`Illegal visit transition: "${from}" → "${to}" is not permitted.`);
  }
}
