import type { StaffRole } from '@prisma/client';
import { roleAllowsAction } from '@/lib/auth/policy/matrix';

export type WorkspaceTab =
  | 'snapshot'
  | 'problems-risks'
  | 'medications-mar'
  | 'care-plan-goals'
  | 'visits-encounters'
  | 'measurements'
  | 'documents'
  | 'labs'
  | 'care-team-consent'
  | 'orders-tasks'
  | 'activity-audit';

const NURSING_TABS: WorkspaceTab[] = [
  'snapshot',
  'problems-risks',
  'medications-mar',
  'care-plan-goals',
  'visits-encounters',
  'measurements',
  'orders-tasks',
];

const PHYSIO_TABS: WorkspaceTab[] = [
  'snapshot',
  'problems-risks',
  'medications-mar',
  'care-plan-goals',
  'visits-encounters',
  'measurements',
  'orders-tasks',
];

const FULL_CLINICAL_TABS: WorkspaceTab[] = [
  'snapshot',
  'problems-risks',
  'medications-mar',
  'care-plan-goals',
  'visits-encounters',
  'measurements',
  'documents',
  'labs',
  'care-team-consent',
  'orders-tasks',
  'activity-audit',
];

export function getWorkspaceTabsForRole(role: StaffRole | null): WorkspaceTab[] {
  switch (role) {
    case 'nurse':
      return NURSING_TABS;
    case 'physiotherapist':
      return PHYSIO_TABS;
    default:
      return FULL_CLINICAL_TABS;
  }
}

// ── UI permission flags — DERIVED FROM THE ROLE MATRIX ───────────────────────
// These mirror the per-module capabilities in `policy/ehr-matrix.ts` via the
// same `roleAllowsAction` lookup the server gate (`requireStaffCan`) uses, so the
// form a user SEES and the action they can SUBMIT can never drift. Edit access
// in `ehr-matrix.ts` (the single source of truth), never here. The server still
// enforces licence + case-scope at submit time — these answer only "may this
// role, in principle, do this?".

export function canEditDemographics(role: StaffRole | null): boolean {
  return !!role && roleAllowsAction(role, 'patient.demographics.update');
}

export function canWriteMedication(role: StaffRole | null): boolean {
  return !!role && roleAllowsAction(role, 'medication.prescribe');
}

export type ClinicalConditionCategory = 'medical' | 'physical_therapy';

export function canWriteClinicalCondition(
  role: StaffRole | null,
  category: ClinicalConditionCategory = 'medical',
): boolean {
  if (!role) return false;
  return roleAllowsAction(role, category === 'physical_therapy' ? 'condition.pt.create' : 'condition.medical.create');
}

export function canCreateNursingShiftHandoff(role: StaffRole | null): boolean {
  return !!role && roleAllowsAction(role, 'nursing_report.create');
}

/**
 * May record vitals / assessments (the chart's otherwise-ungated write forms).
 * Read-only chart roles (e.g. `compliance_officer`, `admin`) are excluded by the
 * matrix, so they get a truly read-only chart. The server enforces this too.
 */
export function canWriteMeasurements(role: StaffRole | null): boolean {
  return !!role && roleAllowsAction(role, 'vitals.record');
}

/** May close a care episode / discharge the patient (matrix: care-plan sign). */
export function canCloseCareEpisode(role: StaffRole | null): boolean {
  return !!role && roleAllowsAction(role, 'episode.close');
}
