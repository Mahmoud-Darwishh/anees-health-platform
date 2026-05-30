'use server';

import { revalidatePath } from 'next/cache';
import { AuditAction, type StaffRole } from '@prisma/client';
import { ZodError } from 'zod';
import { createMedplumEncounter, type MedplumEncounterStatus } from '@/lib/medplum/encounters';
import { createVitalObservations } from '@/lib/medplum/observations';
import { createClinicalNoteDraft, signClinicalNote } from '@/lib/medplum/clinical-notes';
import { ensureCachedMedplumPractitionerForStaff, ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { assignStaffToPatientCareTeam, unassignStaffFromPatientCareTeam } from '@/lib/medplum/care-teams';
import { createPatientTask, updatePatientTaskStatus } from '@/lib/medplum/tasks';
import { createPatientCommunication } from '@/lib/medplum/communications';
import { createPatientAppointment } from '@/lib/medplum/appointments';
import { createNursingReport, createPhysioSessionReport } from '@/lib/medplum/care-reports';
import { upsertCaregiverPortalConsent } from '@/lib/medplum/consents';
import { createPatientCondition } from '@/lib/medplum/conditions';
import { createPatientAllergy } from '@/lib/medplum/allergies';
import { createPatientMedication } from '@/lib/medplum/medications';
import { createPatientDocument, deletePatientDocument } from '@/lib/medplum/documents';
import { createPatientLabOrder, createPatientDiagnosticReport } from '@/lib/medplum/labs';
import { createPatientAssessment } from '@/lib/medplum/assessments';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { CLINICAL_WRITE_ROLES, getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import {
  assignCareTeamSchema,
  createCareTaskSchema,
  createClinicalNoteSchema,
  createNursingReportSchema,
  createPhysioReportSchema,
  createConditionSchema,
  createAllergySchema,
  createMedicationSchema,
  createDocumentSchema,
  deleteDocumentSchema,
  createLabOrderSchema,
  createDiagnosticReportSchema,
  createAssessmentSchema,
  createCommunicationSchema,
  createEscalationSchema,
  createAppointmentSchema,
  formDataToInput,
  recordVisitSchema,
  recordVitalsSchema,
  signClinicalNoteSchema,
  upsertCaregiverConsentSchema,
  unassignCareTeamSchema,
  updateCareTaskStatusSchema,
} from '@/features/ehr/schemas/admin-patient-actions';
import { toCareTeamRole } from './helpers';
import { setAdminPatientFlash } from './flash';

const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB

const COORDINATION_WRITE_ROLES: StaffRole[] = [
  'superadmin',
  'admin',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
];

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
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = recordVitalsSchema.parse(formDataToInput(formData));

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
    });

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
      ],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Vitals saved successfully.' });
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
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createNursingReportSchema.parse(formDataToInput(formData));

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
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
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
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
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
