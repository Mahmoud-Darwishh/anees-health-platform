import { describe, it, expect } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  CLOSED_WORKFLOW_STATES,
  isLegalTransition,
  assertLegalTransition,
} from '@/features/ehr/admin-patient/actions/shared/workflow-legality';
import type { WorkflowStateValue } from '@/features/ehr/admin-patient/actions/shared/workflow-state';

/**
 * VISIT STATE-MACHINE INVARIANTS (B15).
 * -------------------------------------
 * The legality map is the law: no transition may move a visit outside it. These
 * tests lock in the happy path, the disruption entry points, and — most
 * importantly — that a closed/settled visit can never be re-disrupted (which
 * would rewrite its money and attendance).
 */
describe('visit state machine — legality map', () => {
  it('allows the full physio happy-path journey', () => {
    const journey: WorkflowStateValue[] = [
      'scheduled',
      'acknowledged',
      'en_route',
      'arrived',
      'checked_in',
      'checked_out',
    ];
    for (let i = 0; i < journey.length - 1; i += 1) {
      expect(isLegalTransition(journey[i], journey[i + 1])).toBe(true);
    }
  });

  it('checked_out settles into completed and can still be disputed', () => {
    expect(isLegalTransition('checked_out', 'completed')).toBe(true);
    expect(isLegalTransition('checked_out', 'disputed')).toBe(true);
    expect(isLegalTransition('completed', 'disputed')).toBe(true);
  });

  it('a dispute resolves to uphold (completed) or admin force-close (terminal)', () => {
    expect(isLegalTransition('disputed', 'completed')).toBe(true);
    expect(isLegalTransition('disputed', 'force_closed_by_admin')).toBe(true);
    // force_closed_by_admin is terminal — nothing escapes it.
    expect(ALLOWED_TRANSITIONS.force_closed_by_admin).toEqual([]);
    expect(CLOSED_WORKFLOW_STATES.has('force_closed_by_admin')).toBe(true);
  });

  it('never lets a closed visit be re-disrupted (money-rewrite guard)', () => {
    const disruptions: WorkflowStateValue[] = [
      'refused_at_door',
      'patient_not_home',
      'cancelled_by_patient',
      'cancelled_by_med_ops',
      'declined_by_physio',
      'reassigned_to_other_physio',
      'rescheduled_in_place',
      'diverted_in_transit',
      'session_interrupted',
    ];
    for (const closed of CLOSED_WORKFLOW_STATES) {
      for (const to of disruptions) {
        expect(isLegalTransition(closed, to), `${closed} → ${to} must be illegal`).toBe(false);
      }
    }
  });

  it('the specific completed → refused_at_door attack is rejected', () => {
    expect(isLegalTransition('completed', 'refused_at_door')).toBe(false);
    expect(() => assertLegalTransition('completed', 'refused_at_door')).toThrow(/Illegal visit transition/);
  });

  it('rejects a no-op self-transition with a clear message', () => {
    expect(() => assertLegalTransition('acknowledged', 'acknowledged')).toThrow(/already/);
  });

  it('allows plausible disruption entry points from active states', () => {
    expect(isLegalTransition('en_route', 'diverted_in_transit')).toBe(true);
    expect(isLegalTransition('arrived', 'refused_at_door')).toBe(true);
    expect(isLegalTransition('arrived', 'patient_not_home')).toBe(true);
    expect(isLegalTransition('checked_in', 'session_interrupted')).toBe(true);
    expect(isLegalTransition('scheduled', 'declined_by_physio')).toBe(true);
  });

  it('every state key has an explicit (possibly empty) allow-list', () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      expect(Array.isArray(targets), `${from} must declare an allow-list`).toBe(true);
      // every target must itself be a known state key
      for (const to of targets) {
        expect(ALLOWED_TRANSITIONS).toHaveProperty(to);
      }
    }
  });

  it('closed states expose no outbound transitions except dispute paths', () => {
    for (const closed of CLOSED_WORKFLOW_STATES) {
      const targets = ALLOWED_TRANSITIONS[closed] ?? [];
      for (const to of targets) {
        expect(['disputed', 'completed', 'checked_out']).toContain(to);
      }
    }
  });
});
