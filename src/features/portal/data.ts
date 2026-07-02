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
import { prisma } from '@/lib/db/prisma';
import type { PortalRecord, PortalWorkspaceTab } from './types';

/** A portal-safe view of an upcoming operational visit (Postgres source of truth for scheduling). */
export type PortalUpcomingVisit = {
  id: string;
  code: string;
  status: string;
  state: string | null;
  scheduledDate: string; // ISO date (yyyy-mm-dd)
  scheduledTime: string | null;
  visitType: string;
  serviceName: string;
  providerName: string | null;
  /** True once a request (cancel/reschedule) is already pending for this visit. */
  requestPending: boolean;
};

/**
 * Bridge the operational schedule (Postgres `Visit`) into the portal. Medplum
 * `Encounter`s are the clinical record of what happened; the patient's UPCOMING
 * appointments live in Postgres, so the portal reads them straight from there.
 * Session-scoped by the resolved patient id — never a client-supplied id.
 */
async function loadUpcomingVisits(patientId: string, tenantId: string): Promise<PortalUpcomingVisit[]> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const visits = await prisma.visit.findMany({
    where: {
      patientId,
      tenantId,
      status: { in: ['scheduled', 'in_progress', 'rescheduled'] },
      scheduledDate: { gte: startOfToday },
    },
    orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    take: 20,
    select: {
      id: true,
      code: true,
      status: true,
      state: true,
      scheduledDate: true,
      scheduledTime: true,
      visitType: true,
      service: { select: { name: true } },
      provider: { select: { fullName: true } },
      notes: true,
    },
  });

  return visits.map((v) => ({
    id: v.id,
    code: v.code,
    status: v.status,
    state: v.state,
    scheduledDate: v.scheduledDate.toISOString().slice(0, 10),
    scheduledTime: v.scheduledTime,
    visitType: v.visitType,
    serviceName: v.service.name,
    providerName: v.provider?.fullName ?? null,
    // A pending self-service request is tagged into notes as a marker (see actions.ts).
    requestPending: (v.notes ?? '').includes('[PORTAL_REQUEST_PENDING]'),
  }));
}

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
  const loadUpcoming = canSeeVisits && (activeTab === 'overview' || activeTab === 'visits');
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
    upcomingVisits,
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
    loadUpcoming ? loadUpcomingVisits(record.patient.id, record.patient.tenantId).catch(() => []) : Promise.resolve([]),
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
    upcomingVisits,
    careTeamMembers,
    nextAppointment,
    flags: { canSeeVisits, canSeeVitals, canSeeNotes, canSeeTasks, canSeeClinicalDepth },
  };
}

export type PortalData = Awaited<ReturnType<typeof loadPortalData>>;
