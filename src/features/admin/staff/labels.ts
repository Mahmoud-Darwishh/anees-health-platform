import { STAFF_ROLE_VALUES, LICENSE_TYPE_VALUES } from './schemas';

export const ROLE_LABELS: Record<(typeof STAFF_ROLE_VALUES)[number], string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  medical_ops: 'Medical Ops / Case Manager',
  operator: 'Operator (legacy)',
  doctor: 'Doctor',
  physiotherapist: 'Physiotherapist',
  nurse: 'Nurse',
  insurance_coordinator: 'Insurance Coordinator',
  compliance_officer: 'Compliance Officer',
  hospital_partner_admin: 'Hospital Partner Admin',
  finance: 'Finance (legacy)',
  viewer: 'Viewer',
};

export const LICENSE_LABELS: Record<(typeof LICENSE_TYPE_VALUES)[number], string> = {
  medical_syndicate: 'Medical Syndicate',
  nursing_syndicate: 'Nursing Syndicate',
  physiotherapy_syndicate: 'Physiotherapy Syndicate',
  pharmacy_syndicate: 'Pharmacy Syndicate',
  none: 'None',
};

/**
 * Role groups for the create/edit picker. Launch-active disciplines + ops + the
 * back office come first; deferred roles (hospital partner, viewer) sit last so
 * the common choices are top-of-list without removing the others.
 */
export const ROLE_GROUPS: { label: string; roles: (typeof STAFF_ROLE_VALUES)[number][] }[] = [
  { label: 'Clinical', roles: ['doctor', 'nurse', 'physiotherapist'] },
  { label: 'Operations', roles: ['medical_ops', 'operator', 'admin', 'superadmin'] },
  { label: 'Back office', roles: ['insurance_coordinator', 'finance', 'compliance_officer'] },
  { label: 'Deferred (not yet launched)', roles: ['hospital_partner_admin', 'viewer'] },
];

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};
