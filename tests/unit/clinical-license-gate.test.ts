import { describe, it, expect } from 'vitest';
import { ACTIONS, type ActionDefinition, type ActionName } from '@/lib/auth/policy/actions';

const actionEntries = Object.entries(ACTIONS) as [ActionName, ActionDefinition][];

/**
 * CLINICAL LICENSE-GATE INVARIANTS (Phase 7 hardening).
 * -----------------------------------------------------
 * Codifies the rule that every clinical write that produces signed, legally
 * binding clinical content must be licence-gated (enforced at runtime by
 * `can()` via `def.requiresLicense` → `canSignClinical`). If a future action is
 * added without the gate, this fails — so the safeguard can't silently regress.
 */
describe('clinical license-gate invariants', () => {
  it('every discipline-bound SIGN action requires a valid clinical licence', () => {
    for (const [name, def] of actionEntries) {
      if (def.requires === 'sign' && def.discipline) {
        expect(def.requiresLicense, `${name} (signs ${def.discipline} content) must set requiresLicense`).toBe(true);
      }
    }
  });

  it('the critical clinical write actions are all licence-gated', () => {
    const mustBeLicensed: ActionName[] = [
      'vitals.record',
      'assessment.create',
      'assessment.physio.create',
      'note.nursing.sign',
      'note.physio.sign',
      'note.medical.sign',
      'condition.nursing.create',
      'condition.pt.create',
      'condition.medical.create',
      'allergy.create',
      'allergy.retire',
      'medication.prescribe',
      'medication.administer',
      'lab.interpret',
      'standing_order.create',
      'episode.close',
    ];
    for (const name of mustBeLicensed) {
      const def = ACTIONS[name] as ActionDefinition;
      expect(def, `${name} should exist in the action catalog`).toBeTruthy();
      expect(def.requiresLicense, `${name} must be licence-gated`).toBe(true);
    }
  });

  it('every licence-gated clinical write is also case-scoped (own care team only)', () => {
    for (const [name, def] of actionEntries) {
      if (def.requiresLicense) {
        expect(def.requiresCaseScope, `${name} is licence-gated, so it must be case-scoped`).toBe(true);
      }
    }
  });
});
