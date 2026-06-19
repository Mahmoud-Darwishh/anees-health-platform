import { describe, it, expect } from 'vitest';
import { roleAllowsAction } from '@/lib/auth/policy/matrix';
import { cellForRole, meetsCapability } from '@/lib/auth/policy/ehr-matrix';
import {
  canWriteMedication,
  canWriteClinicalCondition,
  canEditDemographics,
  canWriteMeasurements,
  canCloseCareEpisode,
} from '@/features/ehr/admin-patient/role-scope';

/**
 * The role matrix is the security boundary. These tests pin the matrix-derived
 * decisions so a careless edit to `ehr-matrix.ts` (or `role-scope.ts`) can't
 * silently widen access. The UI flags and the server gate both flow through
 * `roleAllowsAction`, so testing one tests the contract for both.
 */

describe('roleAllowsAction (server gate)', () => {
  it('lets a doctor prescribe but never an admin or compliance officer', () => {
    expect(roleAllowsAction('doctor', 'medication.prescribe')).toBe(true);
    expect(roleAllowsAction('superadmin', 'medication.prescribe')).toBe(true);
    expect(roleAllowsAction('admin', 'medication.prescribe')).toBe(false);
    expect(roleAllowsAction('medical_ops', 'medication.prescribe')).toBe(false); // draft only, < sign
    expect(roleAllowsAction('nurse', 'medication.prescribe')).toBe(false);
    expect(roleAllowsAction('compliance_officer', 'medication.prescribe')).toBe(false);
  });

  it('keeps compliance officer strictly read-only across clinical modules', () => {
    const writeActions = [
      'medication.prescribe',
      'condition.medical.create',
      'condition.pt.create',
      'vitals.record',
      'patient.demographics.update',
      'episode.close',
    ] as const;
    for (const action of writeActions) {
      expect(roleAllowsAction('compliance_officer', action)).toBe(false);
    }
    // …but can read the directory.
    expect(roleAllowsAction('compliance_officer', 'patient.directory.read')).toBe(true);
  });

  it('binds diagnosis authorship to the right discipline', () => {
    expect(roleAllowsAction('doctor', 'condition.medical.create')).toBe(true);
    expect(roleAllowsAction('physiotherapist', 'condition.medical.create')).toBe(false);
    expect(roleAllowsAction('physiotherapist', 'condition.pt.create')).toBe(true);
    expect(roleAllowsAction('doctor', 'condition.pt.create')).toBe(false);
  });

  it('gates discharge (episode close) to the physician sign-off only', () => {
    expect(roleAllowsAction('doctor', 'episode.close')).toBe(true);
    expect(roleAllowsAction('superadmin', 'episode.close')).toBe(true);
    expect(roleAllowsAction('nurse', 'episode.close')).toBe(false);
    expect(roleAllowsAction('medical_ops', 'episode.close')).toBe(false);
    expect(roleAllowsAction('admin', 'episode.close')).toBe(false);
  });

  it('lets nurses (not admins) submit nursing handoffs/reports', () => {
    expect(roleAllowsAction('nurse', 'nursing_report.create')).toBe(true);
    expect(roleAllowsAction('admin', 'nursing_report.create')).toBe(false);
  });
});

describe('cellForRole + meetsCapability', () => {
  it('grants compliance read on demographics and hides viewer from vitals', () => {
    expect(cellForRole('patient_demographics', 'compliance_officer').level).toBe('read');
    expect(cellForRole('vitals', 'viewer').level).toBe('hidden');
  });

  it('treats superadmin as a wildcard signer', () => {
    expect(cellForRole('medication_prescribe', 'superadmin').level).toBe('sign');
  });

  it('ranks capabilities correctly', () => {
    expect(meetsCapability('sign', 'write')).toBe(true);
    expect(meetsCapability('read', 'write')).toBe(false);
    expect(meetsCapability('hidden', 'read')).toBe(false);
  });
});

describe('UI permission flags derive from the matrix (no drift)', () => {
  // The exact table verified during Phase 8 — admin must NOT see clinical-write
  // forms it cannot submit.
  const expected: Record<string, [boolean, boolean, boolean, boolean, boolean, boolean]> = {
    // role            med    dxMed  dxPt   demo   vitals discharge
    superadmin: [true, true, true, true, true, true],
    admin: [false, false, false, true, false, false],
    doctor: [true, true, false, false, true, true],
    nurse: [false, false, false, false, true, false],
    physiotherapist: [false, false, true, false, true, false],
    medical_ops: [false, false, true, true, true, false],
    compliance_officer: [false, false, false, false, false, false],
    finance: [false, false, false, false, false, false],
    insurance_coordinator: [false, false, false, false, false, false],
  };

  for (const [role, row] of Object.entries(expected)) {
    it(`matches the matrix for ${role}`, () => {
      const r = role as Parameters<typeof canWriteMedication>[0];
      expect([
        canWriteMedication(r),
        canWriteClinicalCondition(r, 'medical'),
        canWriteClinicalCondition(r, 'physical_therapy'),
        canEditDemographics(r),
        canWriteMeasurements(r),
        canCloseCareEpisode(r),
      ]).toEqual(row);
    });
  }
});
