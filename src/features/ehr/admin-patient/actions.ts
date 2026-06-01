'use server';

import { revalidatePath } from 'next/cache';
import { AuditAction, type StaffRole } from '@prisma/client';
import { ZodError } from 'zod';
import { createMedplumEncounter, type MedplumEncounterStatus } from '@/lib/medplum/encounters';
import { createVitalObservations, listRecentPatientVitals } from '@/lib/medplum/observations';
import { createClinicalNoteDraft, signClinicalNote } from '@/lib/medplum/clinical-notes';
import { ensureCachedMedplumPractitionerForStaff, ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { assignStaffToPatientCareTeam, unassignStaffFromPatientCareTeam } from '@/lib/medplum/care-teams';
import { createPatientTask, listPatientTasks, updatePatientTaskStatus } from '@/lib/medplum/tasks';
import { createPatientCommunication } from '@/lib/medplum/communications';
import { createPatientAppointment } from '@/lib/medplum/appointments';
import { createMedicationAdministrationRecord } from '@/lib/medplum/medication-administrations';
import {
  careReportCode,
  careReportComponentText,
  createNursingReport,
  createNursingShiftHandoffReport,
  createPhysioSessionReport,
  listPatientCareReports,
} from '@/lib/medplum/care-reports';
import { upsertCaregiverPortalConsent } from '@/lib/medplum/consents';
import { createPatientCondition } from '@/lib/medplum/conditions';
import { createPatientAllergy } from '@/lib/medplum/allergies';
import { createPatientMedication } from '@/lib/medplum/medications';
import { createPatientDocument, deletePatientDocument } from '@/lib/medplum/documents';
import { createPatientLabOrder, createPatientDiagnosticReport } from '@/lib/medplum/labs';
import { createPatientAssessment } from '@/lib/medplum/assessments';
import { updateMedplumPatientDemographics } from '@/lib/medplum/patients';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import {
  ESCALATION_SLA_ACK_MINUTES,
  NURSING_SHIFT_ACK_WINDOW_MINUTES,
} from '@/lib/config/nursing-ops-policy';
import { CLINICAL_WRITE_ROLES, getStaffUser } from '@/lib/auth/rbac';
import { evaluatePatientGeoPresence } from '@/lib/geo/presence-policy';
import {
  evaluateVitalsThresholdBreaches,
  formatVitalsThresholdBreachSummary,
} from '@/lib/ehr/nursing-alerts';
import { prisma } from '@/lib/db/prisma';
import {
  assignCareTeamSchema,
  createCareTaskSchema,
  createClinicalNoteSchema,
  createNursingReportSchema,
  createNursingShiftHandoffSchema,
  createPhysioReportSchema,
  createConditionSchema,
  createAllergySchema,
  createMedicationSchema,
  createMedicationAdministrationSchema,
  createDocumentSchema,
  deleteDocumentSchema,
  createLabOrderSchema,
  createDiagnosticReportSchema,
  createAssessmentSchema,
  createCommunicationSchema,
  createIncidentReportSchema,
  createEscalationSchema,
  createAppointmentSchema,
  createNurseShiftAssignmentSchema,
  acknowledgeIncomingNurseSchema,
  updatePatientGeoPolicySchema,
  formDataToInput,
  recordVisitSchema,
  recordVitalsSchema,
  signClinicalNoteSchema,
  updatePatientDemographicsSchema,
  upsertCaregiverConsentSchema,
  unassignCareTeamSchema,
  updateCareTaskStatusSchema,
} from '@/features/ehr/schemas/admin-patient-actions';
import { canEditDemographics, canWriteClinicalCondition, canWriteMedication } from './role-scope';
import { toCareTeamRole } from './helpers';
import { setAdminPatientFlash } from './flash';

const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB
const NURSING_HANDOFF_DEFAULT_RADIUS_METERS = 500;
const NURSING_HANDOFF_MAX_ACCURACY_METERS = 150;

const COORDINATION_WRITE_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

const NURSING_SHIFT_WRITE_ROLES: StaffRole[] = ['superadmin', 'admin', 'nurse'];
const NURSING_REPORT_WRITE_ROLES: StaffRole[] = ['superadmin', 'admin', 'nurse'];

type LocalPatientGeoPolicy = {
  localPatientId: string;
  handoffGeofenceRadiusMeters: number | null;
  temporarilyAwayUntil: Date | null;
  temporarilyAwayNote: string | null;
};

function refreshClinicalPaths(medplumPatientId: string) {
  revalidatePath(`/admin/patients/${medplumPatientId}`);
  revalidatePath('/en/portal');
  revalidatePath('/ar/portal');
}

function getPatientIdFromFormData(formData: FormData): string {
  return String(formData.get('medplumPatientId') ?? '').trim();
}

function parseActionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Invalid form input.';
  }
  return error instanceof Error ? error.message : 'Unexpected error. Please try again.';
}

async function failAction(formData: FormData, error: unknown): Promise<void> {
  const medplumPatientId = getPatientIdFromFormData(formData);
  await setAdminPatientFlash({ type: 'error', message: parseActionError(error) });
  if (medplumPatientId) {
    refreshClinicalPaths(medplumPatientId);
  }
}

async function getClinicalWriterWithPractitioner() {
  const staff = await getStaffUser(CLINICAL_WRITE_ROLES);
  if (!staff?.staffId) {
    throw new Error('Unauthorized');
  }

  const changedBy = staff.staffId;
  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staff.staffId,
    name: staff.name ?? staff.email ?? `Staff ${staff.staffId}`,
    email: staff.email,
    role: staff.staffRole,
  });

  return { staff, practitioner, changedBy };
}

async function getCoordinationWriterWithPractitioner() {
  const staff = await getStaffUser(COORDINATION_WRITE_ROLES);
  if (!staff?.staffId) {
    throw new Error('Unauthorized');
  }

  const changedBy = staff.staffId;
  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staff.staffId,
    name: staff.name ?? staff.email ?? `Staff ${staff.staffId}`,
    email: staff.email,
    role: staff.staffRole,
  });

  return { staff, practitioner, changedBy };
}

async function resolvePractitionerFromStaffId(staffId?: string | null) {
  if (!staffId) {
    return null;
  }

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || staff.status !== 'active') {
    throw new Error('Selected assignee is not active.');
  }

  const practitioner = await ensureMedplumPractitionerForStaff({
    staffId: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  });

  return {
    staff,
    practitioner,
  };
}

async function getLocalPatientGeoPolicy(medplumPatientId: string): Promise<LocalPatientGeoPolicy | null> {
  const localPatient = await prisma.patient.findUnique({
    where: { medplumPatientId },
    select: {
      id: true,
      handoffGeofenceRadiusMeters: true,
      temporarilyAwayUntil: true,
      temporarilyAwayNote: true,
    },
  });

  if (!localPatient) {
    return null;
  }

  return {
    localPatientId: localPatient.id,
    handoffGeofenceRadiusMeters: localPatient.handoffGeofenceRadiusMeters,
    temporarilyAwayUntil: localPatient.temporarilyAwayUntil,
    temporarilyAwayNote: localPatient.temporarilyAwayNote,
  };
}

async function createEscalationAndCommunication(params: {
  patientId: string;
  encounterId?: string | null;
  title: string;
  summary: string;
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  senderReference: string;
  senderDisplay: string;
  recipientReference?: string | null;
  recipientDisplay?: string | null;
  dueDate?: Date | null;
}): Promise<{ taskId: string | null; communicationId: string | null }> {
  const escalationTask = await createPatientTask({
    patientId: params.patientId,
    encounterId: params.encounterId ?? null,
    ownerReference: params.recipientReference ?? null,
    ownerDisplay: params.recipientDisplay ?? null,
    title: params.title,
    description: params.summary,
    dueDate: params.dueDate ?? null,
    priority: params.priority,
    taskCode: 'escalation',
  });

  const communication = await createPatientCommunication({
    patientId: params.patientId,
    encounterId: params.encounterId ?? null,
    category: 'escalation',
    priority: params.priority,
    message: params.summary,
    senderReference: params.senderReference,
    senderDisplay: params.senderDisplay,
    recipientReference: params.recipientReference ?? null,
    recipientDisplay: params.recipientDisplay ?? null,
    basedOnTaskId: escalationTask.id ?? null,
  });

  return {
    taskId: escalationTask.id ?? null,
    communicationId: communication.id ?? null,
  };
}

async function hasRecentOpenVitalsAutoEscalation(medplumPatientId: string): Promise<boolean> {
  const tasks = await listPatientTasks(medplumPatientId, 100);
  const now = Date.now();

  return tasks.some((task) => {
    const isEscalation = task.code?.coding?.[0]?.code === 'escalation';
    const isOpen = !['completed', 'cancelled'].includes(task.status);
    const isVitalsAlert = (task.code?.text ?? '').toLowerCase().includes('vitals')
      || (task.description ?? '').toLowerCase().includes('vitals threshold');
    const authoredAt = task.authoredOn ? new Date(task.authoredOn).getTime() : NaN;
    const isRecent = Number.isFinite(authoredAt) && now - authoredAt <= 6 * 60 * 60 * 1000;

    return isEscalation && isOpen && isVitalsAlert && isRecent;
  });
}

async function runEscalationSlaSweepForPatient(
  medplumPatientId: string,
  sender: { reference: string; display: string },
): Promise<number> {
  const tasks = await listPatientTasks(medplumPatientId, 120);
  const nowMs = Date.now();
  const thresholdMs = ESCALATION_SLA_ACK_MINUTES * 60 * 1000;

  let breachedCount = 0;

  for (const task of tasks) {
    if (task.code?.coding?.[0]?.code !== 'escalation') {
      continue;
    }

    if (!['requested', 'received', 'ready'].includes(task.status)) {
      continue;
    }

    const authoredMs = task.authoredOn ? new Date(task.authoredOn).getTime() : NaN;
    if (!Number.isFinite(authoredMs) || nowMs - authoredMs < thresholdMs) {
      continue;
    }

    const summary = `Escalation SLA breach: task ${task.id ?? 'unknown'} has not been acknowledged within ${ESCALATION_SLA_ACK_MINUTES} minutes.`;

    await createPatientCommunication({
      patientId: medplumPatientId,
      category: 'escalation',
      priority: 'stat',
      message: summary,
      senderReference: sender.reference,
      senderDisplay: sender.display,
      recipientReference: task.owner?.reference ?? null,
      recipientDisplay: task.owner?.display ?? null,
      basedOnTaskId: task.id ?? null,
    });

    breachedCount += 1;
  }

  return breachedCount;
}

async function assertRosteredNurseForPatientIfNurse(
  staff: { staffId?: string | null; staffRole?: StaffRole | null },
  medplumPatientId: string,
  atTime: Date,
): Promise<void> {
  if (staff.staffRole !== 'nurse') {
    return;
  }

  if (!staff.staffId) {
    throw new Error('Nurse account is missing staff identity.');
  }

  const localPatient = await prisma.patient.findUnique({
    where: { medplumPatientId },
    select: { id: true },
  });

  if (!localPatient?.id) {
    throw new Error('Local patient profile is missing; cannot validate roster ownership.');
  }

  const activeAssignment = await prisma.nurseShiftAssignment.findFirst({
    where: {
      patientId: localPatient.id,
      status: {
        in: ['scheduled', 'in_progress'],
      },
      shiftStartAt: {
        lte: atTime,
      },
      shiftEndAt: {
        gte: atTime,
      },
      OR: [
        { primaryNurseStaffId: staff.staffId },
        { incomingNurseStaffId: staff.staffId },
      ],
    },
    select: { id: true },
  });

  if (!activeAssignment) {
    throw new Error('Roster check failed: nurse is not assigned to an active shift for this patient at the selected time.');
  }
}

export async function recordVisitAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = recordVisitSchema.parse(formDataToInput(formData));
    const medplumPatientId = input.medplumPatientId;
    const status = input.status as MedplumEncounterStatus;

    const encounter = await createMedplumEncounter({
      patientId: medplumPatientId,
      status,
      visitType: input.visitType,
      start: input.startAt,
      recordedByReference: practitioner.reference,
      recordedByName: staff.name ?? staff.email,
      notes: input.notes ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumEncounter',
      recordId: encounter.id ?? `${medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'period.start', 'serviceType', 'subject', 'participant.individual'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit saved successfully.' });
    refreshClinicalPaths(medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function recordVitalsAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = recordVitalsSchema.parse(formDataToInput(formData));

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, input.recordedAt);

    const observations = await createVitalObservations({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
      recordedAt: input.recordedAt,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      temperatureC: input.temperatureC,
      glucoseMgDl: input.glucoseMgDl,
      weightKg: input.weightKg,
      spo2Pct: input.spo2Pct,
      painScore: input.painScore,
    });

    const breaches = evaluateVitalsThresholdBreaches({
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      temperatureC: input.temperatureC,
      glucoseMgDl: input.glucoseMgDl,
      spo2Pct: input.spo2Pct,
      painScore: input.painScore,
    });

    if (breaches.length > 0) {
      const hasRecentAutoEscalation = await hasRecentOpenVitalsAutoEscalation(input.medplumPatientId);

      if (!hasRecentAutoEscalation) {
        await createEscalationAndCommunication({
          patientId: input.medplumPatientId,
          encounterId: input.encounterId ?? null,
          title: 'Vitals threshold alert',
          summary: `Automatic escalation generated from abnormal vitals: ${formatVitalsThresholdBreachSummary(
            breaches,
          )}`,
          priority: 'urgent',
          senderReference: practitioner.reference,
          senderDisplay: practitioner.display,
        });

        await writeMedplumAuditMirror({
          tableName: 'MedplumEscalationTask',
          recordId: `${input.medplumPatientId}:${Date.now()}`,
          action: AuditAction.create,
          changedFields: ['code', 'status', 'priority', 'description', 'for', 'encounter', 'owner'],
          changedBy,
        });
      }
    }

    await writeMedplumAuditMirror({
      tableName: 'MedplumObservation',
      recordId: observations.map((obs) => obs.id).filter(Boolean).join(',') || `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: [
        'effectiveDateTime',
        'encounter',
        'performer',
        'bloodPressure',
        'heartRate',
        'temperatureC',
        'glucoseMgDl',
        'weightKg',
        'spo2Pct',
        'painScore',
      ],
      changedBy,
    });

    const alertMessage = breaches.length > 0
      ? ` Vitals threshold alert triggered (${breaches.length} out-of-range metric${
          breaches.length > 1 ? 's' : ''
        }).`
      : '';

    await setAdminPatientFlash({
      type: 'success',
      message: `Vitals saved successfully.${alertMessage}`,
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createClinicalNoteDraftAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createClinicalNoteSchema.parse(formDataToInput(formData));

    const draft = await createClinicalNoteDraft({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      title: input.noteTitle ?? '',
      noteBody: input.noteBody,
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: draft.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'title', 'section.text', 'subject', 'encounter', 'author'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Draft note saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function signClinicalNoteAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = signClinicalNoteSchema.parse(formDataToInput(formData));

    await signClinicalNote(
      input.compositionId,
      {
        authorReference: practitioner.reference,
        authorDisplay: practitioner.display,
      },
      {
        expectedVersionId: input.noteVersionId ?? null,
      },
    );

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: input.compositionId,
      action: AuditAction.update,
      changedFields: ['status', 'date', 'author', 'extension.signedAt'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Note signed successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function assignCareTeamMemberAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = assignCareTeamSchema.parse(formDataToInput(formData));

    const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
    if (!staff || staff.status !== 'active') {
      throw new Error('Selected staff member is not active.');
    }

    const roleCode = toCareTeamRole(staff.role);
    if (!roleCode) {
      throw new Error('This staff role cannot be assigned to clinical care teams.');
    }

    const practitioner = await ensureMedplumPractitionerForStaff({
      staffId: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
    });

    const careTeam = await assignStaffToPatientCareTeam(
      input.medplumPatientId,
      {
        practitionerReference: practitioner.reference,
        display: staff.name,
        roleCode,
      },
      {
        expectedVersionId: input.careTeamVersionId ?? null,
      },
    );

    await writeMedplumAuditMirror({
      tableName: 'MedplumCareTeam',
      recordId: careTeam.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.update,
      changedFields: ['participant'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Care team member assigned.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function unassignCareTeamMemberAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = unassignCareTeamSchema.parse(formDataToInput(formData));

    const careTeam = await unassignStaffFromPatientCareTeam(input.medplumPatientId, input.practitionerReference, {
      expectedVersionId: input.careTeamVersionId ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCareTeam',
      recordId: careTeam?.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.update,
      changedFields: ['participant'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Care team member unassigned.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createCareTaskAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = createCareTaskSchema.parse(formDataToInput(formData));

    const task = await createPatientTask({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      title: input.taskTitle,
      description: input.taskDescription ?? '',
      dueDate: input.taskDueDate,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumTask',
      recordId: task.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'code', 'description', 'for', 'executionPeriod'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Task created successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updateCareTaskStatusAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = updateCareTaskStatusSchema.parse(formDataToInput(formData));

    const task = await updatePatientTaskStatus(input.taskId, input.nextStatus, {
      expectedVersionId: input.taskVersionId ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumTask',
      recordId: task.id ?? input.taskId,
      action: AuditAction.update,
      changedFields: ['status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Task status updated.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createNursingReportAction(formData: FormData): Promise<void> {
  try {
    const staff = await getStaffUser(NURSING_REPORT_WRITE_ROLES);
    if (!staff?.staffId || !staff.staffRole) {
      throw new Error('Unauthorized');
    }

    const changedBy = staff.staffId;
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: staff.staffId,
      name: staff.name ?? staff.email ?? `Staff ${staff.staffId}`,
      email: staff.email,
      role: staff.staffRole,
    });
    const input = createNursingReportSchema.parse(formDataToInput(formData));

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, new Date());

    if (input.escalationNeeded === true && (input.followUpPlan ?? '').trim().length < 10) {
      throw new Error('When escalation is needed, include a clear follow-up plan.');
    }

    if (input.escalationNeeded === true) {
      const activeEscalation = (await listPatientTasks(input.medplumPatientId, 80)).find(
        (task) =>
          task.code?.coding?.[0]?.code === 'escalation' &&
          !['completed', 'cancelled'].includes(task.status),
      );

      if (!activeEscalation) {
        const escalationTask = await createPatientTask({
          patientId: input.medplumPatientId,
          encounterId: input.encounterId ?? null,
          title: 'Nursing safety escalation',
          description: input.followUpPlan ?? input.noteBody,
          priority: 'urgent',
          taskCode: 'escalation',
        });

        await createPatientCommunication({
          patientId: input.medplumPatientId,
          encounterId: input.encounterId ?? null,
          category: 'escalation',
          priority: 'urgent',
          message: input.followUpPlan ?? input.noteBody,
          senderReference: practitioner.reference,
          senderDisplay: practitioner.display,
          basedOnTaskId: escalationTask.id ?? null,
        });

        await writeMedplumAuditMirror({
          tableName: 'MedplumEscalationTask',
          recordId: escalationTask.id ?? `${input.medplumPatientId}:${Date.now()}`,
          action: AuditAction.create,
          changedFields: ['status', 'priority', 'code', 'description', 'for'],
          changedBy,
        });
      }
    }

    const report = await createNursingReport({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
      noteBody: input.noteBody,
      conditionSummary: input.conditionSummary ?? '',
      escalationNeeded: input.escalationNeeded,
      followUpPlan: input.followUpPlan ?? '',
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumNursingReport',
      recordId: report.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['code', 'subject', 'encounter', 'performer', 'component', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Nursing report saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createNursingShiftHandoffAction(formData: FormData): Promise<void> {
  try {
    const staff = await getStaffUser(NURSING_SHIFT_WRITE_ROLES);
    if (!staff?.staffId || !staff.staffRole) {
      throw new Error('Unauthorized');
    }

    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: staff.staffId,
      name: staff.name ?? staff.email ?? `Staff ${staff.staffId}`,
      email: staff.email,
      role: staff.staffRole,
    });

    const input = createNursingShiftHandoffSchema.parse(formDataToInput(formData));

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, input.shiftEndAt);

    const localGeoPolicy = await getLocalPatientGeoPolicy(input.medplumPatientId);
    const now = new Date();
    const isTemporarilyAway =
      !!localGeoPolicy?.temporarilyAwayUntil && localGeoPolicy.temporarilyAwayUntil.getTime() > now.getTime();
    const effectiveRadiusMeters =
      localGeoPolicy?.handoffGeofenceRadiusMeters && localGeoPolicy.handoffGeofenceRadiusMeters > 0
        ? localGeoPolicy.handoffGeofenceRadiusMeters
        : NURSING_HANDOFF_DEFAULT_RADIUS_METERS;

    const geoPresence = await evaluatePatientGeoPresence({
      patientId: input.medplumPatientId,
      currentLocation: {
        latitude: input.handoffLatitude,
        longitude: input.handoffLongitude,
      },
      accuracyMeters: input.handoffAccuracyMeters,
      purpose: 'nursing-handoff',
      policy: {
        maxDistanceMeters: effectiveRadiusMeters,
        maxAccuracyMeters: NURSING_HANDOFF_MAX_ACCURACY_METERS,
      },
    });

    if (!isTemporarilyAway && !geoPresence.allowed) {
      throw new Error(
        geoPresence.failureReason
          ? `Handoff rejected: ${geoPresence.failureReason}`
          : `Handoff rejected: you must be within ${effectiveRadiusMeters}m of patient location.`,
      );
    }

    const [taskList, reportList] = await Promise.all([
      listPatientTasks(input.medplumPatientId, 60),
      listPatientCareReports(input.medplumPatientId, 30),
    ]);

    const recentVitals = await listRecentPatientVitals(input.medplumPatientId, 80);
    const vitalsWithinShift = recentVitals.filter((row) => {
      const measuredAt = new Date(row.measuredAt).getTime();
      if (Number.isNaN(measuredAt)) {
        return false;
      }
      return measuredAt >= input.shiftStartAt.getTime() && measuredAt <= input.shiftEndAt.getTime();
    });

    if (vitalsWithinShift.length === 0) {
      throw new Error('Record at least one vital set during this shift before handoff.');
    }

    const hasOpenTask = taskList.some((task) => !['completed', 'cancelled'].includes(task.status));
    if (hasOpenTask && input.pendingTasksSummary.trim().length < 10) {
      throw new Error('Pending task handoff is required when open tasks exist.');
    }

    if (input.escalationStatus === 'active') {
      const hasActiveEscalation = taskList.some(
        (task) => task.code?.coding?.[0]?.code === 'escalation' && !['completed', 'cancelled'].includes(task.status),
      );

      if (!hasActiveEscalation) {
        throw new Error('Escalation status is set to active, but no active escalation task is open.');
      }
    }

    const latestShiftHandoff = reportList
      .filter((report) => careReportCode(report) === 'nursing-shift-handoff')
      .sort((a, b) => {
        const aTime = new Date(a.effectiveDateTime ?? 0).getTime();
        const bTime = new Date(b.effectiveDateTime ?? 0).getTime();
        return bTime - aTime;
      })[0];

    const latestShiftEndRaw = latestShiftHandoff
      ? careReportComponentText(latestShiftHandoff, 'shift-end-at')
      : null;
    const latestShiftEnd = latestShiftEndRaw ? new Date(latestShiftEndRaw) : null;

    if (latestShiftEnd && !Number.isNaN(latestShiftEnd.getTime()) && input.shiftStartAt < latestShiftEnd) {
      throw new Error('Shift start cannot be earlier than the last recorded nursing handoff end time.');
    }

    const handoff = await createNursingShiftHandoffReport({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
      noteBody: input.handoffNote,
      recordedAt: input.shiftEndAt,
      shiftStartAt: input.shiftStartAt,
      shiftEndAt: input.shiftEndAt,
      patientStatusSummary: input.patientStatusSummary,
      pendingTasksSummary: input.pendingTasksSummary,
      medicationSafetySummary: input.medicationSafetySummary,
      escalationStatus: input.escalationStatus,
      nextShiftFocus: input.nextShiftFocus,
      handoffLatitude: input.handoffLatitude,
      handoffLongitude: input.handoffLongitude,
      handoffAccuracyMeters: input.handoffAccuracyMeters,
      distanceFromPatientMeters: geoPresence.distanceMeters,
      withinPatientRadius: isTemporarilyAway ? true : geoPresence.allowed,
      handoffAttestation: isTemporarilyAway
        ? `completed-with-temporary-away-override:${localGeoPolicy?.temporarilyAwayNote ?? 'no-reason'}`
        : 'completed-and-attested-onsite',
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumNursingShiftHandoff',
      recordId: handoff.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['code', 'subject', 'encounter', 'performer', 'effectiveDateTime', 'component', 'note', 'geofence.distance'],
      changedBy: staff.staffId,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Nursing shift handoff submitted successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createPhysioReportAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createPhysioReportSchema.parse(formDataToInput(formData));

    const report = await createPhysioSessionReport({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
      noteBody: input.noteBody,
      interventions: input.interventions ?? '',
      painBefore: input.painBefore,
      painAfter: input.painAfter,
      responseSummary: input.responseSummary ?? '',
      homePlan: input.homePlan ?? '',
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumPhysioReport',
      recordId: report.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['code', 'subject', 'encounter', 'performer', 'component', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Physiotherapy report saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createConditionAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    if (!canWriteClinicalCondition(staff.staffRole ?? null)) {
      throw new Error('Only doctors and admins can add conditions.');
    }
    const input = createConditionSchema.parse(formDataToInput(formData));

    const condition = await createPatientCondition({
      patientId: input.medplumPatientId,
      label: input.conditionLabel,
      code: input.conditionCode ?? null,
      onsetDate: input.conditionOnsetDate ?? null,
      note: input.conditionNote ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCondition',
      recordId: condition.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['clinicalStatus', 'verificationStatus', 'code', 'subject', 'onsetDateTime', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Problem added successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createAllergyAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createAllergySchema.parse(formDataToInput(formData));

    const allergy = await createPatientAllergy({
      patientId: input.medplumPatientId,
      allergen: input.allergen,
      reaction: input.allergyReaction ?? null,
      severity: input.allergySeverity ?? null,
      onsetDate: input.allergyOnsetDate ?? null,
      note: input.allergyNote ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumAllergyIntolerance',
      recordId: allergy.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['clinicalStatus', 'verificationStatus', 'code', 'reaction', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Allergy added successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createMedicationAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    if (!canWriteMedication(staff.staffRole ?? null)) {
      throw new Error('Only doctors and admins can add medications.');
    }
    const input = createMedicationSchema.parse(formDataToInput(formData));

    const medication = await createPatientMedication({
      patientId: input.medplumPatientId,
      medication: input.medicationName,
      dosage: input.dosageText ?? null,
      route: input.routeText ?? null,
      frequency: input.frequencyText ?? null,
      status: input.medicationStatus,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      note: input.medicationNote ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumMedicationStatement',
      recordId: medication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'medicationCodeableConcept', 'effectivePeriod', 'dosage', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Medication added successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createMedicationAdministrationAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createMedicationAdministrationSchema.parse(formDataToInput(formData));

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, input.administeredAt);

    const administration = await createMedicationAdministrationRecord({
      patientId: input.medplumPatientId,
      medicationStatementId: input.medicationStatementId ?? null,
      medicationName: input.medicationName,
      encounterId: input.encounterId ?? null,
      scheduledAt: input.scheduledAt ?? null,
      administeredAt: input.administeredAt,
      administrationStatus: input.administrationStatus,
      reason: input.administrationReason ?? null,
      note: input.administrationNote ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumMedicationAdministration',
      recordId: administration.id,
      action: AuditAction.create,
      changedFields: ['status', 'category', 'medicationCodeableConcept', 'subject', 'performer', 'reasonCode', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Medication administration saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createIncidentReportAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createIncidentReportSchema.parse(formDataToInput(formData));

    const message = [
      `Incident type: ${input.incidentType}`,
      `Summary: ${input.incidentSummary}`,
      input.incidentActionsTaken ? `Actions taken: ${input.incidentActionsTaken}` : null,
    ]
      .filter((line): line is string => !!line)
      .join('\n');

    const communication = await createPatientCommunication({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      category: 'incident',
      priority: input.incidentSeverity,
      message,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCommunication',
      recordId: communication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'category', 'subject', 'sender', 'payload'],
      changedBy,
    });

    if (input.incidentEscalationNeeded === true) {
      const escalation = await createEscalationAndCommunication({
        patientId: input.medplumPatientId,
        encounterId: input.encounterId ?? null,
        title: `Incident escalation: ${input.incidentType}`,
        summary: `${input.incidentSummary}${
          input.incidentActionsTaken ? `\nActions taken: ${input.incidentActionsTaken}` : ''
        }`,
        priority: input.incidentSeverity,
        senderReference: practitioner.reference,
        senderDisplay: practitioner.display,
      });

      await writeMedplumAuditMirror({
        tableName: 'MedplumEscalationTask',
        recordId: escalation.taskId ?? `${input.medplumPatientId}:${Date.now()}`,
        action: AuditAction.create,
        changedFields: ['status', 'priority', 'code', 'description', 'for', 'encounter'],
        changedBy,
      });
    }

    await setAdminPatientFlash({ type: 'success', message: 'Incident report logged successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createDocumentAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createDocumentSchema.parse(formDataToInput(formData));
    const file = formData.get('documentFile');

    if (!(file instanceof File) || file.size <= 0) {
      throw new Error('Document file is required.');
    }

    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new Error('Document is too large. Maximum allowed size is 10 MB.');
    }

    const uploaded = await createPatientDocument({
      patientId: input.medplumPatientId,
      title: input.documentTitle,
      originalFilename: file.name || input.documentTitle,
      contentType: file.type || 'application/octet-stream',
      data: Buffer.from(await file.arrayBuffer()),
      category: input.documentCategory,
      note: input.documentNote ?? null,
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
      documentDate: input.documentDate ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumDocumentReference',
      recordId: uploaded.id,
      action: AuditAction.create,
      changedFields: ['status', 'subject', 'type', 'category', 'content', 'author'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Document uploaded successfully. It is now available in the list below for download.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = deleteDocumentSchema.parse(formDataToInput(formData));

    const deleted = await deletePatientDocument(input.documentId);

    await writeMedplumAuditMirror({
      tableName: 'MedplumDocumentReference',
      recordId: deleted.documentId,
      action: AuditAction.delete,
      changedFields: ['status', 'content.attachment.url'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Document deleted successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createLabOrderAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createLabOrderSchema.parse(formDataToInput(formData));

    const order = await createPatientLabOrder({
      patientId: input.medplumPatientId,
      title: input.labOrderTitle,
      category: input.labOrderCategory,
      code: input.labOrderCode ?? null,
      note: input.labOrderNote ?? null,
      requestedOn: input.labOrderDate ?? null,
      requestedByReference: practitioner.reference,
      requestedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumServiceRequest',
      recordId: order.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'intent', 'category', 'code', 'subject', 'authoredOn', 'requester'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Lab order saved successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createDiagnosticReportAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createDiagnosticReportSchema.parse(formDataToInput(formData));

    const report = await createPatientDiagnosticReport({
      patientId: input.medplumPatientId,
      title: input.diagnosticTitle,
      category: input.diagnosticCategory,
      status: input.diagnosticStatus,
      conclusion: input.diagnosticConclusion ?? null,
      note: input.diagnosticNote ?? null,
      effectiveDate: input.diagnosticEffectiveOn ?? null,
      issuedDate: input.diagnosticIssuedOn ?? null,
      linkedOrderId: input.linkedLabOrderId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumDiagnosticReport',
      recordId: report.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'category', 'code', 'subject', 'effectiveDateTime', 'issued', 'basedOn', 'performer', 'conclusion'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Diagnostic report saved successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createAssessmentAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createAssessmentSchema.parse(formDataToInput(formData));

    const assessment = await createPatientAssessment({
      patientId: input.medplumPatientId,
      title: input.assessmentTitle,
      assessmentType: input.assessmentType,
      score: input.assessmentScore ?? null,
      summary: input.assessmentSummary,
      notes: input.assessmentNote ?? null,
      encounterId: input.assessmentEncounterId ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumQuestionnaireResponse',
      recordId: assessment.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'questionnaire', 'subject', 'author', 'item'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Assessment saved successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createCommunicationAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createCommunicationSchema.parse(formDataToInput(formData));

    const recipient = await resolvePractitionerFromStaffId(input.communicationRecipientStaffId ?? null);

    const communication = await createPatientCommunication({
      patientId: input.medplumPatientId,
      encounterId: input.communicationEncounterId ?? null,
      category: input.communicationCategory,
      priority: input.communicationPriority,
      message: input.communicationMessage,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
      recipientReference: recipient?.practitioner.reference ?? null,
      recipientDisplay: recipient?.staff.name ?? null,
      basedOnTaskId: input.linkedTaskId ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCommunication',
      recordId: communication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'category', 'subject', 'sender', 'recipient', 'payload', 'basedOn'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Communication sent successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createEscalationAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createEscalationSchema.parse(formDataToInput(formData));

    const owner = await resolvePractitionerFromStaffId(input.escalationOwnerStaffId ?? null);

    const escalationTask = await createPatientTask({
      patientId: input.medplumPatientId,
      encounterId: input.escalationEncounterId ?? null,
      ownerReference: owner?.practitioner.reference ?? null,
      ownerDisplay: owner?.staff.name ?? null,
      title: input.escalationTitle,
      description: input.escalationSummary,
      dueDate: input.escalationDueDate ?? null,
      priority: input.escalationPriority,
      taskCode: 'escalation',
    });

    const communication = await createPatientCommunication({
      patientId: input.medplumPatientId,
      encounterId: input.escalationEncounterId ?? null,
      category: 'escalation',
      priority: input.escalationPriority,
      message: input.escalationSummary,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
      recipientReference: owner?.practitioner.reference ?? null,
      recipientDisplay: owner?.staff.name ?? null,
      basedOnTaskId: escalationTask.id ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumEscalationTask',
      recordId: escalationTask.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'code', 'description', 'for', 'owner', 'executionPeriod'],
      changedBy,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCommunication',
      recordId: communication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'category', 'subject', 'sender', 'recipient', 'payload', 'basedOn'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Escalation created and routed successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createAppointmentAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createAppointmentSchema.parse(formDataToInput(formData));

    const owner = await resolvePractitionerFromStaffId(input.appointmentOwnerStaffId ?? null);

    const appointment = await createPatientAppointment({
      patientId: input.medplumPatientId,
      startAt: input.appointmentStart,
      endAt: input.appointmentEnd,
      visitType: input.appointmentType,
      note: input.appointmentNote ?? null,
      practitionerReference: owner?.practitioner.reference ?? null,
      practitionerDisplay: owner?.staff.name ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumAppointment',
      recordId: appointment.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'serviceType', 'participant', 'start', 'end', 'description'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Appointment scheduled successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createNurseShiftAssignmentAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    if (!NURSING_SHIFT_WRITE_ROLES.includes(staff.staffRole ?? 'viewer')) {
      throw new Error('Only nurse/admin roles can manage shift roster assignments.');
    }

    const input = createNurseShiftAssignmentSchema.parse(formDataToInput(formData));
    const localPatient = await prisma.patient.findUnique({
      where: { medplumPatientId: input.medplumPatientId },
      select: { id: true },
    });

    if (!localPatient?.id) {
      throw new Error('Local patient record is missing. Sync patient record before assigning shifts.');
    }

    const nurse = await prisma.staff.findUnique({
      where: { id: input.primaryNurseStaffId },
      select: { id: true, role: true, status: true, name: true },
    });

    if (!nurse || nurse.status !== 'active' || nurse.role !== 'nurse') {
      throw new Error('Primary assignment must target an active nurse.');
    }

    const overlap = await prisma.nurseShiftAssignment.findFirst({
      where: {
        patientId: localPatient.id,
        status: {
          in: ['scheduled', 'in_progress'],
        },
        shiftStartAt: {
          lt: input.shiftEndAt,
        },
        shiftEndAt: {
          gt: input.shiftStartAt,
        },
      },
      select: { id: true },
    });

    if (overlap) {
      throw new Error('Shift overlaps an existing active assignment for this patient.');
    }

    const assignment = await prisma.nurseShiftAssignment.create({
      data: {
        patientId: localPatient.id,
        primaryNurseStaffId: nurse.id,
        shiftStartAt: input.shiftStartAt,
        shiftEndAt: input.shiftEndAt,
        status: 'scheduled',
        notes: input.shiftNotes ?? null,
        createdByStaffId: staff.staffId,
      },
      select: { id: true },
    });

    await writeMedplumAuditMirror({
      tableName: 'NurseShiftAssignment',
      recordId: assignment.id,
      action: AuditAction.create,
      changedFields: ['patientId', 'primaryNurseStaffId', 'shiftStartAt', 'shiftEndAt', 'status', 'notes'],
      changedBy,
    });

    await createPatientCommunication({
      patientId: input.medplumPatientId,
      category: 'handoff',
      priority: 'routine',
      message: `Shift roster updated: ${nurse.name} assigned from ${input.shiftStartAt.toISOString()} to ${input.shiftEndAt.toISOString()}.`,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Shift assignment added.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function acknowledgeIncomingNurseAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = acknowledgeIncomingNurseSchema.parse(formDataToInput(formData));

    const assignment = await prisma.nurseShiftAssignment.findUnique({
      where: { id: input.assignmentId },
      include: {
        patient: {
          select: {
            medplumPatientId: true,
          },
        },
        primaryNurse: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!assignment || assignment.patient.medplumPatientId !== input.medplumPatientId) {
      throw new Error('Shift assignment not found for this patient.');
    }

    const fallbackStaffId = staff.staffId;
    if (!fallbackStaffId) {
      throw new Error('Incoming nurse account is missing.');
    }
    const incomingNurseId = input.incomingNurseStaffId ?? fallbackStaffId;
    const incomingNurse = await prisma.staff.findUnique({
      where: { id: incomingNurseId },
      select: { id: true, role: true, status: true, name: true },
    });

    if (!incomingNurse || incomingNurse.status !== 'active' || incomingNurse.role !== 'nurse') {
      throw new Error('Incoming acknowledgement must be completed by an active nurse account.');
    }

    await prisma.nurseShiftAssignment.update({
      where: { id: assignment.id },
      data: {
        incomingNurseStaffId: incomingNurse.id,
        acknowledgedAt: input.acknowledgedAt,
        notes: input.acknowledgementNote ?? assignment.notes,
        status: input.acknowledgedAt >= assignment.shiftStartAt ? 'in_progress' : assignment.status,
      },
    });

    const minutesLate = Math.floor(
      (input.acknowledgedAt.getTime() - assignment.shiftStartAt.getTime()) / (60 * 1000),
    );

    if (minutesLate > NURSING_SHIFT_ACK_WINDOW_MINUTES) {
      const escalation = await createEscalationAndCommunication({
        patientId: input.medplumPatientId,
        title: 'Shift acknowledgment delayed',
        summary: `Incoming nurse acknowledgment happened after ${minutesLate} minutes. Allowed window is ${NURSING_SHIFT_ACK_WINDOW_MINUTES} minutes.`,
        priority: 'urgent',
        senderReference: practitioner.reference,
        senderDisplay: practitioner.display,
      });

      await prisma.nurseShiftAssignment.update({
        where: { id: assignment.id },
        data: {
          escalationTaskId: escalation.taskId,
        },
      });

      await writeMedplumAuditMirror({
        tableName: 'MedplumEscalationTask',
        recordId: escalation.taskId ?? `${input.medplumPatientId}:${Date.now()}`,
        action: AuditAction.create,
        changedFields: ['status', 'priority', 'code', 'description', 'for'],
        changedBy,
      });
    }

    await writeMedplumAuditMirror({
      tableName: 'NurseShiftAssignment',
      recordId: assignment.id,
      action: AuditAction.update,
      changedFields: ['incomingNurseStaffId', 'acknowledgedAt', 'status', 'notes', 'escalationTaskId'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Incoming nurse acknowledgment saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updatePatientGeoPolicyAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    if (!canEditDemographics(staff.staffRole ?? null)) {
      throw new Error('Only admin/operator roles can update geofence policy.');
    }

    const input = updatePatientGeoPolicySchema.parse(formDataToInput(formData));

    await prisma.patient.updateMany({
      where: { medplumPatientId: input.medplumPatientId },
      data: {
        handoffGeofenceRadiusMeters: input.handoffGeofenceRadiusMeters ?? null,
        temporarilyAwayUntil: input.temporarilyAwayUntil ?? null,
        temporarilyAwayNote: input.temporarilyAwayNote ?? null,
      },
    });

    await writeMedplumAuditMirror({
      tableName: 'PatientGeoPolicy',
      recordId: input.medplumPatientId,
      action: AuditAction.update,
      changedFields: ['handoffGeofenceRadiusMeters', 'temporarilyAwayUntil', 'temporarilyAwayNote'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Patient geofence policy saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function runEscalationSlaSweepAction(formData: FormData): Promise<void> {
  try {
    const { practitioner } = await getCoordinationWriterWithPractitioner();
    const medplumPatientId = getPatientIdFromFormData(formData);
    if (!medplumPatientId) {
      throw new Error('Patient id is required.');
    }

    const breachedCount = await runEscalationSlaSweepForPatient(medplumPatientId, {
      reference: practitioner.reference,
      display: practitioner.display,
    });

    await setAdminPatientFlash({
      type: 'success',
      message:
        breachedCount > 0
          ? `Escalation SLA sweep completed. ${breachedCount} escalation(s) exceeded acknowledgment SLA.`
          : 'Escalation SLA sweep completed. No breached escalations were found.',
    });
    refreshClinicalPaths(medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function upsertCaregiverConsentAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = upsertCaregiverConsentSchema.parse(formDataToInput(formData));

    const consent = await upsertCaregiverPortalConsent({
      patientMedplumId: input.medplumPatientId,
      consentId: input.consentId,
      expectedVersionId: input.consentVersionId,
      decision: input.decision,
      identity: {
        phone: input.caregiverPhone,
        email: input.caregiverEmail,
      },
      scopes: input.scopes,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumConsent',
      recordId: consent.id,
      action: AuditAction.update,
      changedFields: ['provision.type', 'extension.portalScope', 'extension.caregiverIdentity', 'status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Caregiver portal consent saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updatePatientDemographicsAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getClinicalWriterWithPractitioner();
    if (!canEditDemographics(staff.staffRole ?? null)) {
      throw new Error('Your role has read-only access to patient demographics.');
    }
    const demographicSection = String(formData.get('demographicSection') ?? '').trim();
    const input = updatePatientDemographicsSchema.parse(formDataToInput(formData));

    const patient = await updateMedplumPatientDemographics({
      patientId: input.medplumPatientId,
      expectedVersionId: input.patientVersionId,
      addressDetail: input.addressDetail ?? null,
      landmark: input.landmark ?? null,
      addressMapUrl: input.addressMapUrl ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelation: input.emergencyContactRelation ?? null,
    });

    await prisma.patient.updateMany({
      where: { medplumPatientId: input.medplumPatientId },
      data: {
        addressDetail: input.addressDetail ?? null,
        landmark: input.landmark ?? null,
        addressMapUrl: input.addressMapUrl ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        emergencyContactRelation: input.emergencyContactRelation ?? null,
      },
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumPatient',
      recordId: patient.id ?? input.medplumPatientId,
      action: AuditAction.update,
      changedFields: ['address', 'address.extension.address-map-url'],
      changedBy,
    });

    await setAdminPatientFlash({
      type: 'success',
      message:
        demographicSection === 'residence'
          ? 'Patient address saved.'
          : demographicSection === 'emergency'
            ? 'Emergency contact saved.'
            : 'Patient demographics saved.',
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}
