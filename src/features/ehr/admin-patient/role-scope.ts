import type { StaffRole } from '@prisma/client';

export type WorkspaceTab =
  | 'overview'
  | 'clinical'
  | 'documents'
  | 'labs'
  | 'assessments'
  | 'consent'
  | 'visits'
  | 'vitals'
  | 'notes'
  | 'care-team'
  | 'coordination'
  | 'scheduling'
  | 'tasks'
  | 'reports';

const NURSING_TABS: WorkspaceTab[] = [
  'overview',
  'clinical',
  'visits',
  'vitals',
  'notes',
  'coordination',
  'tasks',
  'reports',
];

const PHYSIO_TABS: WorkspaceTab[] = [
  'overview',
  'clinical',
  'visits',
  'vitals',
  'notes',
  'tasks',
  'reports',
  'coordination',
  'scheduling',
];

const FULL_CLINICAL_TABS: WorkspaceTab[] = [
  'overview',
  'clinical',
  'documents',
  'labs',
  'assessments',
  'consent',
  'visits',
  'vitals',
  'notes',
  'care-team',
  'coordination',
  'scheduling',
  'tasks',
  'reports',
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

export function canEditDemographics(role: StaffRole | null): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'medical_ops' || role === 'operator' || role === 'finance';
}

export function canWriteMedication(role: StaffRole | null): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'doctor';
}

export type ClinicalConditionCategory = 'medical' | 'physical_therapy';

export function canWriteClinicalCondition(
  role: StaffRole | null,
  category: ClinicalConditionCategory = 'medical',
): boolean {
  if (category === 'physical_therapy') {
    return role === 'superadmin' || role === 'admin' || role === 'physiotherapist';
  }

  return role === 'superadmin' || role === 'admin' || role === 'doctor';
}

export function canCreateNursingShiftHandoff(role: StaffRole | null): boolean {
  return role === 'nurse' || role === 'superadmin' || role === 'admin';
}
