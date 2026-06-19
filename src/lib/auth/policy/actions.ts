import type { ClinicalDiscipline } from '@/lib/auth/rbac';
import type { Capability, ModuleKey } from './ehr-matrix';

export type ActionDefinition = {
  module: ModuleKey;
  requires: Capability;
  discipline?: ClinicalDiscipline | null;
  requiresLicense?: boolean;
  requiresCaseScope?: boolean;
  sensitive?: boolean;
};

export const ACTIONS = {
  // Workspace and read gates
  'workspace.physio.access': { module: 'physio_workspace', requires: 'read' },
  'workspace.nursing.access': { module: 'nursing_workspace', requires: 'read' },
  'workspace.doctor.access': { module: 'doctor_workspace', requires: 'read' },
  'patient.directory.read': { module: 'patient_demographics', requires: 'read' },
  'patient.read': { module: 'patient_demographics', requires: 'read', requiresCaseScope: true },
  'patient.banner.read': { module: 'patient_banner', requires: 'read', requiresCaseScope: true },
  'patient.demographics.update': { module: 'patient_demographics', requires: 'write' },
  'restricted.read': { module: 'restricted_tier', requires: 'read', requiresCaseScope: true, sensitive: true },
  'break_glass.request': { module: 'restricted_tier', requires: 'read', sensitive: true },
  'break_glass.approve': { module: 'audit_log', requires: 'read', sensitive: true },
  'break_glass.reject': { module: 'audit_log', requires: 'read', sensitive: true },
  'audit_log.read': { module: 'audit_log', requires: 'read', sensitive: true },
  'insurance.read': { module: 'insurance_claims', requires: 'read' },
  'ops.disputes.read': { module: 'visits_schedule', requires: 'read' },
  'dashboard.nursing.read': { module: 'aggregate_kpis', requires: 'read' },

  // Visit lifecycle
  'visit.acknowledge': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.start_travel': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.mark_arrived': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.check_in': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.check_out': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.decline': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.mark_refused_at_door': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.mark_patient_not_home': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.dispute': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },
  'visit.schedule.update': { module: 'visits_schedule', requires: 'write' },
  'visit.workflow.update': { module: 'visit_checkin_checkout', requires: 'write', requiresCaseScope: true },

  // Clinical documentation and assessments
  'vitals.record': {
    module: 'vitals', requires: 'sign',
    requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'note.nursing.create_draft': { module: 'nursing_notes', requires: 'write', discipline: 'nursing', requiresCaseScope: true, sensitive: true },
  'note.nursing.sign': {
    module: 'nursing_notes', requires: 'sign',
    discipline: 'nursing', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'note.physio.create_draft': { module: 'physio_notes', requires: 'write', discipline: 'physiotherapy', requiresCaseScope: true, sensitive: true },
  'note.physio.sign': {
    module: 'physio_notes', requires: 'sign',
    discipline: 'physiotherapy', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'note.medical.create_draft': { module: 'medical_notes', requires: 'write', discipline: 'medical', requiresCaseScope: true, sensitive: true },
  'note.medical.sign': {
    module: 'medical_notes', requires: 'sign',
    discipline: 'medical', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'note.physio_session.create': {
    module: 'physio_notes', requires: 'sign',
    discipline: 'physiotherapy', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'nursing_report.create': {
    module: 'nursing_notes', requires: 'sign',
    discipline: 'nursing', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'assessment.create': { module: 'assessments', requires: 'sign', requiresLicense: true, requiresCaseScope: true, sensitive: true },
  'assessment.physio.create': {
    module: 'assessments', requires: 'sign',
    discipline: 'physiotherapy', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'condition.nursing.create': {
    module: 'nursing_diagnoses', requires: 'sign',
    discipline: 'nursing', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'condition.pt.create': {
    module: 'pt_diagnoses', requires: 'sign',
    discipline: 'physiotherapy', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'condition.medical.create': {
    module: 'medical_diagnoses', requires: 'sign',
    discipline: 'medical', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'condition.retire': {
    module: 'medical_diagnoses', requires: 'sign',
    requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'allergy.create': { module: 'allergies', requires: 'sign', requiresLicense: true, requiresCaseScope: true, sensitive: true },
  'allergy.retire': { module: 'allergies', requires: 'sign', requiresLicense: true, requiresCaseScope: true, sensitive: true },

  // Medication, labs, documents
  'medication.prescribe': {
    module: 'medication_prescribe', requires: 'sign',
    discipline: 'medical', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'medication.administer': {
    module: 'medication_administer', requires: 'sign',
    discipline: 'nursing', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'medication.reconcile': { module: 'medication_reconciliation', requires: 'write', requiresCaseScope: true, sensitive: true },
  'lab.order': { module: 'lab_order', requires: 'write', requiresCaseScope: true, sensitive: true },
  'lab.interpret': {
    module: 'lab_interpret', requires: 'sign',
    discipline: 'medical', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'document.create': { module: 'documents', requires: 'write', requiresCaseScope: true, sensitive: true },
  'document.delete': { module: 'documents', requires: 'write', requiresCaseScope: true, sensitive: true },

  // Care plan, coordination, consent, incidents
  'goal.create': { module: 'care_plan', requires: 'write', discipline: 'physiotherapy', requiresCaseScope: true },
  'goal.update_progress': { module: 'care_plan', requires: 'write', discipline: 'physiotherapy', requiresCaseScope: true },
  'goal.mark_met': { module: 'care_plan', requires: 'write', discipline: 'physiotherapy', requiresCaseScope: true },
  'discharge_summary.create': {
    module: 'physio_notes', requires: 'sign',
    discipline: 'physiotherapy', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'episode.close': {
    module: 'care_plan', requires: 'sign',
    discipline: 'medical', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'task.start': { module: 'tasks', requires: 'write', discipline: 'physiotherapy' },
  'task.complete': { module: 'tasks', requires: 'write', discipline: 'physiotherapy' },
  'task.create': { module: 'tasks', requires: 'write', requiresCaseScope: true },
  'task.update': { module: 'tasks', requires: 'write', requiresCaseScope: true },
  'care_team.assign': { module: 'care_team', requires: 'write' },
  'care_team.read': { module: 'care_team', requires: 'read', requiresCaseScope: true },
  'appointment.create': { module: 'visits_schedule', requires: 'write' },
  'communication.create': { module: 'communications', requires: 'write', requiresCaseScope: true, sensitive: true },
  'incident_report.create': { module: 'incident_reports', requires: 'write', requiresCaseScope: true, sensitive: true },
  'escalation.read': { module: 'escalations', requires: 'read', requiresCaseScope: true },
  'standing_order.create': {
    module: 'standing_orders', requires: 'sign',
    discipline: 'medical', requiresLicense: true, requiresCaseScope: true, sensitive: true,
  },
  'standing_order.execute': { module: 'standing_orders', requires: 'write', requiresCaseScope: true, sensitive: true },
  'consent.write': { module: 'consent_records', requires: 'write' },
  'nursing_shift.manage': { module: 'visits_schedule', requires: 'write' },
  'escalation.update': { module: 'escalations', requires: 'write', requiresCaseScope: true },

  // Staff / user management (governance). `staff_user_mgmt` grants admin `sign`
  // and compliance `read` in the matrix — so reads are visible to compliance
  // for oversight, while every create/edit/credential change stays admin-only.
  'staff.read': { module: 'staff_user_mgmt', requires: 'read' },
  'staff.create': { module: 'staff_user_mgmt', requires: 'sign', sensitive: true },
  'staff.update': { module: 'staff_user_mgmt', requires: 'sign', sensitive: true },
  'staff.set_status': { module: 'staff_user_mgmt', requires: 'sign', sensitive: true },
  'staff.issue_credential_link': { module: 'staff_user_mgmt', requires: 'sign', sensitive: true },
} satisfies Record<string, ActionDefinition>;

export type ActionName = keyof typeof ACTIONS;
