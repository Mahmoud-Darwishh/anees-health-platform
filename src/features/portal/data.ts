import 'server-only';

import { listPatientEncounters } from '@/lib/medplum/encounters';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import { listPatientTasks } from '@/lib/medplum/tasks';
import { getActivePatientCareTeam } from '@/lib/medplum/care-teams';
import { listPatientCarePlans } from '@/lib/medplum/care-plans';
import { listPatientConditions } from '@/lib/medplum/conditions';
import { listPatientAllergies } from '@/lib/medplum/allergies';
import { listPatientMedications } from '@/lib/medplum/medications';
import { listPatientDocuments } from '@/lib/medplum/documents';
import { listPatientLabOrders, listPatientDiagnosticReports } from '@/lib/medplum/labs';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import type { PortalRecord, PortalWorkspaceTab } from './types';

/**
 * Tab-aware data loader for the patient portal. Loads only the datasets the
 * ACTIVE tab needs (the overview tab is the superset). Every fetch is guarded by
 * caregiver-consent scope and falls back to an empty result so one failing
 * Medplum call never blanks the whole workspace.
 *
 * Mirrors the EHR's tab-aware loading discipline — lazy datasets feed only their
 * own tab, never a cross-cutting header.
 */
export async function loadPortalData(record: PortalRecord, activeTab: PortalWorkspaceTab) {
  const medplumPatientId = record.patient.medplumPatientId;
  const scopes = record.access.scopes;

  const canSeeVisits = scopes.includes('visits');
  const canSeeVitals = scopes.includes('vitals');
  const canSeeNotes = scopes.includes('notes');
  const canSeeTasks = scopes.includes('tasks');
  const canSeeClinicalDepth = record.access.mode === 'patient';

  const loadVisits = medplumPatientId && canSeeVisits && (activeTab === 'overview' || activeTab === 'visits');
  const loadVitals = medplumPatientId && canSeeVitals && (activeTab === 'overview' || activeTab === 'vitals');
  const loadNotes = medplumPatientId && canSeeNotes && (activeTab === 'overview' || activeTab === 'notes');
  const loadTasks = medplumPatientId && canSeeTasks && (activeTab === 'overview' || activeTab === 'tasks');
  const loadCare = medplumPatientId && (activeTab === 'overview' || activeTab === 'care');
  const loadClinical = medplumPatientId && canSeeClinicalDepth && (activeTab === 'overview' || activeTab === 'clinical');
  const loadFiles = medplumPatientId && canSeeClinicalDepth && (activeTab === 'overview' || activeTab === 'files');

  const [
    encounters,
    vitals,
    signedNotes,
    activeTasks,
    carePlans,
    careTeam,
    problems,
    allergies,
    medications,
    documents,
    labOrders,
    labResults,
    assessments,
  ] = await Promise.all([
    loadVisits ? listPatientEncounters(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadVitals ? listRecentPatientVitals(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadNotes
      ? listPatientClinicalNotes(medplumPatientId, 20, { signedOnly: true }).catch(() => [])
      : Promise.resolve([]),
    loadTasks
      ? listPatientTasks(medplumPatientId, 25)
          .then((tasks) => tasks.filter((task) => ['requested', 'in-progress', 'on-hold'].includes(task.status)))
          .catch(() => [])
      : Promise.resolve([]),
    loadCare ? listPatientCarePlans(medplumPatientId, 10).catch(() => []) : Promise.resolve([]),
    loadCare ? getActivePatientCareTeam(medplumPatientId).catch(() => null) : Promise.resolve(null),
    loadClinical ? listPatientConditions(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadClinical ? listPatientAllergies(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadClinical ? listPatientMedications(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadFiles ? listPatientDocuments(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadFiles ? listPatientLabOrders(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadFiles ? listPatientDiagnosticReports(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadClinical ? listPatientAssessments(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
  ]);

  const careTeamMembers = careTeam?.participant ?? [];
  const nextAppointment =
    encounters.find((encounter) => encounter.status === 'planned' && !!encounter.period?.start) ?? null;

  return {
    encounters,
    vitals,
    signedNotes,
    activeTasks,
    carePlans,
    careTeam,
    problems,
    allergies,
    medications,
    documents,
    labOrders,
    labResults,
    assessments,
    careTeamMembers,
    nextAppointment,
    flags: { canSeeVisits, canSeeVitals, canSeeNotes, canSeeTasks, canSeeClinicalDepth },
  };
}

export type PortalData = Awaited<ReturnType<typeof loadPortalData>>;
