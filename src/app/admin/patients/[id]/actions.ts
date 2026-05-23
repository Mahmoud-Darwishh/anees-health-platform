'use server';

import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord, canBypassPatientAssignment } from '@/lib/auth/record-access';
import { getAuditedPrisma } from '@/lib/db/audited-prisma';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function assertStaffRoleAllowed(
  role: string | null | undefined,
  allowed: Array<'superadmin' | 'admin' | 'doctor' | 'physiotherapist' | 'nurse'>
) {
  if (!role || !allowed.includes(role as (typeof allowed)[number])) {
    throw new Error('Forbidden');
  }
}

function getText(formData: FormData, name: string, maxLen: number): string | null {
  const value = formData.get(name);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function getOptionalDate(formData: FormData, name: string): Date | null {
  const value = formData.get(name);
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getOptionalFloat(formData: FormData, name: string): number | null {
  const value = formData.get(name);
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getOptionalInt(formData: FormData, name: string): number | null {
  const value = formData.get(name);
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on';
}

function getEnumValue<T extends string>(formData: FormData, name: string, values: readonly T[]): T | null {
  const value = getText(formData, name, 64);
  if (!value) return null;
  if (!values.includes(value as T)) return null;
  return value as T;
}

function redirectToPatient(patientId: string, updated: string, tab?: string | null) {
  const params = new URLSearchParams({ updated });
  if (tab) {
    params.set('tab', tab);
  }
  redirect(`/admin/patients/${patientId}?${params.toString()}`);
}

export async function updatePatientCoreAction(formData: FormData) {
  const session = await requireStaffPermission('patients.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  if (!patientId) throw new Error('Invalid patient');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const status = getText(formData, 'status', 20);
  const fullName = getText(formData, 'fullName', 180);
  const arabicName = getText(formData, 'arabicName', 180);
  const phone = getText(formData, 'phone', 40);
  const gender = getEnumValue(formData, 'gender', ['M', 'F', 'other'] as const);
  const dateOfBirth = getOptionalDate(formData, 'dateOfBirth');
  const nationalId = getText(formData, 'nationalId', 30);
  const passportNumber = getText(formData, 'passportNumber', 30);
  const bloodGroup = getEnumValue(formData, 'bloodGroup', [
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
    'UNKNOWN',
  ] as const);
  const maritalStatus = getEnumValue(formData, 'maritalStatus', [
    'single',
    'married',
    'divorced',
    'widowed',
    'separated',
    'other',
  ] as const);
  const preferredLanguage = getEnumValue(formData, 'preferredLanguage', ['en', 'ar'] as const);
  const religion = getText(formData, 'religion', 120);
  const occupation = getText(formData, 'occupation', 160);
  const insuranceProvider = getText(formData, 'insuranceProvider', 140);
  const insuranceMemberId = getText(formData, 'insuranceMemberId', 80);
  const insurancePolicyNumber = getText(formData, 'insurancePolicyNumber', 80);
  const insuranceExpiry = getOptionalDate(formData, 'insuranceExpiry');
  const dnrStatus = getEnumValue(formData, 'dnrStatus', ['full_code', 'dnr', 'unknown'] as const);
  const addressDetail = getText(formData, 'addressDetail', 300);
  const landmark = getText(formData, 'landmark', 180);
  const gpsLatitude = getOptionalFloat(formData, 'gpsLatitude');
  const gpsLongitude = getOptionalFloat(formData, 'gpsLongitude');
  const addressMapUrl = getText(formData, 'addressMapUrl', 500);
  const emergencyContactName = getText(formData, 'emergencyContactName', 180);
  const emergencyContactPhone = getText(formData, 'emergencyContactPhone', 40);
  const emergencyContactRelation = getText(formData, 'emergencyContactRelation', 120);
  const primaryCaregiver = getText(formData, 'primaryCaregiver', 180);
  const primaryCaregiverPhone = getText(formData, 'primaryCaregiverPhone', 40);
  const primaryCaregiverWhatsapp = getText(formData, 'primaryCaregiverWhatsapp', 40);
  const primaryCaregiverEmail = getText(formData, 'primaryCaregiverEmail', 180);
  const caregiverRelation = getText(formData, 'caregiverRelation', 120);
  const chiefComplaint = getText(formData, 'chiefComplaint', 500);
  const notes = getText(formData, 'notes', 2000);
  const tab = getText(formData, 'tab', 40);

  await auditedPrisma.patient.update({
    where: { id: patientId },
    data: {
      ...(status ? { status: status as 'new' | 'active' | 'lapsed' | 'inactive' } : {}),
      fullName: fullName ?? undefined,
      arabicName,
      phone: phone ?? undefined,
      gender: gender ?? undefined,
      dateOfBirth,
      nationalId,
      passportNumber,
      bloodGroup: bloodGroup ?? undefined,
      maritalStatus: maritalStatus ?? undefined,
      preferredLanguage: preferredLanguage ?? undefined,
      religion,
      occupation,
      insuranceProvider,
      insuranceMemberId,
      insurancePolicyNumber,
      insuranceExpiry,
      dnrStatus: dnrStatus ?? undefined,
      addressDetail,
      landmark,
      gpsLatitude,
      gpsLongitude,
      addressMapUrl,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      primaryCaregiver,
      primaryCaregiverPhone,
      primaryCaregiverWhatsapp,
      primaryCaregiverEmail,
      caregiverRelation,
      chiefComplaint,
      notes,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'core', tab);
}

export async function addAllergyAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const allergen = getText(formData, 'allergen', 140);
  const reaction = getText(formData, 'reaction', 300);
  const severity = getText(formData, 'severity', 40);
  const notes = getText(formData, 'notes', 1000);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !allergen) throw new Error('Invalid allergy payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.allergy.create({
    data: {
      patientId,
      allergen,
      reaction,
      severity,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'allergy', tab ?? 'history');
}

export async function addMedicationAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const medicationName = getText(formData, 'medicationName', 160);
  const dose = getText(formData, 'dose', 100);
  const frequency = getText(formData, 'frequency', 100);
  const route = getText(formData, 'route', 80);
  const startDate = getOptionalDate(formData, 'startDate');
  const notes = getText(formData, 'notes', 1000);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !medicationName) throw new Error('Invalid medication payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.medication.create({
    data: {
      patientId,
      medicationName,
      dose,
      frequency,
      route,
      startDate,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'medication', tab ?? 'history');
}

export async function addProgressNoteAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const noteBody = getText(formData, 'noteBody', 8000);
  const signedOff = formData.get('signedOff') === 'on';
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !noteBody) throw new Error('Invalid progress note payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.progressNote.create({
    data: {
      patientId,
      visitId,
      noteBody,
      enteredByStaffId: session.user.staffId ?? null,
      ...(signedOff
        ? {
            signedOffAt: new Date(),
            signedOffByStaffId: session.user.staffId ?? null,
          }
        : {}),
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'progress-note', tab ?? 'doctor');
}

export async function signProgressNoteAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const progressNoteId = getText(formData, 'progressNoteId', 64);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !progressNoteId) throw new Error('Invalid progress note sign-off payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const note = await auditedPrisma.progressNote.findFirst({
    where: {
      id: progressNoteId,
      patientId,
      deletedAt: null,
    },
    select: {
      id: true,
      signedOffAt: true,
    },
  });

  if (!note) {
    throw new Error('Progress note not found');
  }

  if (note.signedOffAt) {
    throw new Error('Progress note is already signed');
  }

  await auditedPrisma.progressNote.update({
    where: { id: progressNoteId },
    data: {
      signedOffAt: new Date(),
      signedOffByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'progress-note-signed', tab ?? 'doctor');
}

export async function addProgressNoteAddendumAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const progressNoteId = getText(formData, 'progressNoteId', 64);
  const addendumBody = getText(formData, 'addendumBody', 4000);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !progressNoteId || !addendumBody) {
    throw new Error('Invalid progress note addendum payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const note = await auditedPrisma.progressNote.findFirst({
    where: {
      id: progressNoteId,
      patientId,
      deletedAt: null,
    },
    select: {
      id: true,
      signedOffAt: true,
    },
  });

  if (!note) {
    throw new Error('Progress note not found');
  }

  if (!note.signedOffAt) {
    throw new Error('Progress note must be signed before addenda are added');
  }

  await auditedPrisma.progressNoteAddendum.create({
    data: {
      progressNoteId,
      addendumBody,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'progress-note-addendum', tab ?? 'doctor');
}

export async function addDiagnosisAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const diagnosisName = getText(formData, 'diagnosisName', 220);
  const icd10Code = getText(formData, 'icd10Code', 24);
  const status = getText(formData, 'status', 60);
  const diagnosedOn = getOptionalDate(formData, 'diagnosedOn');
  const notes = getText(formData, 'notes', 3000);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !diagnosisName) throw new Error('Invalid diagnosis payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.diagnosis.create({
    data: {
      patientId,
      visitId,
      diagnosisName,
      icd10Code,
      status,
      diagnosedOn,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'diagnosis', tab ?? 'doctor');
}

export async function addPhysioSessionReportAction(formData: FormData) {
  const session = await requireStaffPermission('physio.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'physiotherapist']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const sessionDate = getOptionalDate(formData, 'sessionDate');
  const sessionNumberRaw = getText(formData, 'sessionNumber', 5);
  const treatmentPlan = getText(formData, 'treatmentPlan', 1200);
  const interventions = getText(formData, 'interventions', 3000);
  const response = getText(formData, 'response', 2000);
  const mobilityNote = getText(formData, 'mobilityNote', 1200);
  const homeExercisePlan = getText(formData, 'homeExercisePlan', 1500);
  const nextSessionDate = getOptionalDate(formData, 'nextSessionDate');
  const painScoreBeforeRaw = getText(formData, 'painScoreBefore', 3);
  const painScoreAfterRaw = getText(formData, 'painScoreAfter', 3);
  const tab = getText(formData, 'tab', 40);

  const sessionNumber = sessionNumberRaw ? Number.parseInt(sessionNumberRaw, 10) : Number.NaN;
  const painScoreBefore = painScoreBeforeRaw ? Number.parseInt(painScoreBeforeRaw, 10) : null;
  const painScoreAfter = painScoreAfterRaw ? Number.parseInt(painScoreAfterRaw, 10) : null;

  if (!patientId || !sessionDate || Number.isNaN(sessionNumber) || !interventions) {
    throw new Error('Invalid physio session payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.physioSessionReport.create({
    data: {
      patientId,
      visitId,
      sessionDate,
      sessionNumber,
      treatmentPlan,
      interventions,
      response,
      painScoreBefore,
      painScoreAfter,
      mobilityNote,
      homeExercisePlan,
      nextSessionDate,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'physio', tab ?? 'physio');
}

export async function addNurseDailyReportAction(formData: FormData) {
  const session = await requireStaffPermission('nursing.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'nurse']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const reportDate = getOptionalDate(formData, 'reportDate');
  const shiftType = getText(formData, 'shiftType', 32);
  const generalCondition = getText(formData, 'generalCondition', 250);
  const intakeOutput = getText(formData, 'intakeOutput', 400);
  const medicationGiven = getText(formData, 'medicationGiven', 400);
  const woundCare = getText(formData, 'woundCare', 400);
  const fallsRisk = getText(formData, 'fallsRisk', 120);
  const escalationReason = getText(formData, 'escalationReason', 800);
  const nursingNotes = getText(formData, 'nursingNotes', 4000);
  const followUpInstructions = getText(formData, 'followUpInstructions', 1200);
  const escalationFlag = formData.get('escalationFlag') === 'on';
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !reportDate || !nursingNotes) {
    throw new Error('Invalid nurse report payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.nurseDailyReport.create({
    data: {
      patientId,
      visitId,
      reportDate,
      shiftType,
      generalCondition,
      intakeOutput,
      medicationGiven,
      woundCare,
      fallsRisk,
      escalationFlag,
      escalationReason,
      nursingNotes,
      followUpInstructions,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'nurse-report', tab ?? 'nursing');
}

export async function addVitalSignsAction(formData: FormData) {
  const session = await requireStaffPermission('nursing.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'nurse']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const measuredAt = getOptionalDate(formData, 'measuredAt') ?? new Date();
  const tab = getText(formData, 'tab', 40);

  if (!patientId) throw new Error('Invalid vitals payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const intOrNull = (name: string) => {
    const raw = getText(formData, name, 6);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const decimalOrNull = (name: string) => {
    const raw = getText(formData, name, 10);
    if (!raw) return null;
    const parsed = Number.parseFloat(raw);
    return Number.isNaN(parsed) ? null : parsed;
  };

  await auditedPrisma.vitalSigns.create({
    data: {
      patientId,
      visitId,
      measuredAt,
      systolicBp: intOrNull('systolicBp'),
      diastolicBp: intOrNull('diastolicBp'),
      heartRate: intOrNull('heartRate'),
      respiratoryRate: intOrNull('respiratoryRate'),
      oxygenSaturation: intOrNull('oxygenSaturation'),
      temperatureC: decimalOrNull('temperatureC'),
      weightKg: decimalOrNull('weightKg'),
      notes: getText(formData, 'notes', 1200),
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'vitals', tab ?? 'nursing');
}

export async function addCareTeamMessageAction(formData: FormData) {
  const session = await requireStaffPermission('messaging.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const relatedVisitId = getText(formData, 'relatedVisitId', 64);
  const channelType = getText(formData, 'channelType', 24) ?? 'in_app';
  const visibilityScope = getText(formData, 'visibilityScope', 32) ?? 'care_team';
  const messageBody = getText(formData, 'messageBody', 4000);
  const followUpDueAt = getOptionalDate(formData, 'followUpDueAt');
  const requiresFollowUp = formData.get('requiresFollowUp') === 'on';
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !messageBody) throw new Error('Invalid care message payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.careTeamMessage.create({
    data: {
      patientId,
      relatedVisitId,
      channelType,
      visibilityScope,
      messageBody,
      requiresFollowUp,
      followUpDueAt,
      authorStaffId: session.user.staffId ?? session.user.id,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'care-message', tab ?? 'coordination');
}

export async function createCallRoutingTicketAction(formData: FormData) {
  const session = await requireStaffPermission('call-routing.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const sourceChannel = getText(formData, 'sourceChannel', 40);
  const reasonCategory = getText(formData, 'reasonCategory', 80);
  const triagePriority = getText(formData, 'triagePriority', 20) ?? 'routine';
  const summary = getText(formData, 'summary', 2000);
  const targetCallbackAt = getOptionalDate(formData, 'targetCallbackAt');
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !sourceChannel || !reasonCategory) throw new Error('Invalid call routing payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.careCallRoutingTicket.create({
    data: {
      patientId,
      sourceChannel,
      reasonCategory,
      triagePriority,
      summary,
      targetCallbackAt,
      assignedStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'call-routing', tab ?? 'coordination');
}

export async function addAiTriageCaseAction(formData: FormData) {
  const session = await requireStaffPermission('ai-triage.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const symptomSummary = getText(formData, 'symptomSummary', 4000);
  const urgencyLevel = getText(formData, 'urgencyLevel', 20);
  const recommendedDisposition = getText(formData, 'recommendedDisposition', 120);
  const recommendedSpecialty = getText(formData, 'recommendedSpecialty', 120);
  const reasoning = getText(formData, 'reasoning', 3000);
  const modelVersion = getText(formData, 'modelVersion', 80);
  const riskScoreRaw = getText(formData, 'riskScore', 10);
  const riskScore = riskScoreRaw ? Number.parseFloat(riskScoreRaw) : null;
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !symptomSummary) throw new Error('Invalid ai triage payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.aiTriageCase.create({
    data: {
      patientId,
      symptomSummary,
      riskScore: Number.isNaN(riskScore ?? Number.NaN) ? null : riskScore,
      urgencyLevel,
      recommendedDisposition,
      recommendedSpecialty,
      reasoning,
      modelVersion,
      status: 'draft',
      submittedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'ai-triage', tab ?? 'coordination');
}

export async function addCaregiverAction(formData: FormData) {
  const session = await requireStaffPermission('patients.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const fullName = getText(formData, 'fullName', 180);
  const relationship = getText(formData, 'relationship', 120);
  const phoneNumber = getText(formData, 'phoneNumber', 40);
  const whatsappNumber = getText(formData, 'whatsappNumber', 40);
  const email = getText(formData, 'email', 180);
  const isPrimary = getCheckbox(formData, 'isPrimary');
  const isAuthorized = getCheckbox(formData, 'isAuthorized');
  const notes = getText(formData, 'notes', 1000);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !fullName) {
    throw new Error('Invalid caregiver payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  if (isPrimary) {
    await prisma.patientCaregiver.updateMany({
      where: { patientId, deletedAt: null, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  await auditedPrisma.patientCaregiver.create({
    data: {
      patientId,
      fullName,
      relationship,
      phoneNumber,
      whatsappNumber,
      email,
      isPrimary,
      isAuthorized,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'caregiver', tab ?? 'profile');
}

export async function addSocialHistoryAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const smokingStatus = getEnumValue(formData, 'smokingStatus', ['never', 'former', 'current', 'unknown'] as const);
  const alcoholUse = getEnumValue(formData, 'alcoholUse', ['none', 'occasional', 'regular', 'unknown'] as const);
  const mobility = getEnumValue(formData, 'mobility', ['independent', 'assisted', 'wheelchair', 'bedridden', 'unknown'] as const);
  const functionalIndependence = getEnumValue(formData, 'functionalIndependence', [
    'independent',
    'partial_assistance',
    'full_assistance',
    'dependent',
    'unknown',
  ] as const);
  const livingConditions = getText(formData, 'livingConditions', 500);
  const caregiverSupport = getText(formData, 'caregiverSupport', 500);
  const notes = getText(formData, 'notes', 1200);
  const recordedAt = getOptionalDate(formData, 'recordedAt') ?? new Date();
  const tab = getText(formData, 'tab', 40);

  if (!patientId) {
    throw new Error('Invalid social history payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.patientSocialHistory.create({
    data: {
      patientId,
      smokingStatus: smokingStatus ?? undefined,
      alcoholUse: alcoholUse ?? undefined,
      mobility: mobility ?? undefined,
      functionalIndependence: functionalIndependence ?? undefined,
      livingConditions,
      caregiverSupport,
      notes,
      recordedAt,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'social-history', tab ?? 'history');
}

export async function addVaccinationRecordAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const vaccineName = getText(formData, 'vaccineName', 180);
  const doseNumber = getText(formData, 'doseNumber', 40);
  const administeredOn = getOptionalDate(formData, 'administeredOn');
  const facilityName = getText(formData, 'facilityName', 180);
  const nextDueDate = getOptionalDate(formData, 'nextDueDate');
  const notes = getText(formData, 'notes', 1200);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !vaccineName) {
    throw new Error('Invalid vaccination payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.vaccinationRecord.create({
    data: {
      patientId,
      vaccineName,
      doseNumber,
      administeredOn,
      facilityName,
      nextDueDate,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'vaccination', tab ?? 'history');
}

export async function addRiskFlagAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const code = getEnumValue(formData, 'code', [
    'fall_risk',
    'bedridden',
    'dementia',
    'stroke_history',
    'aggressive_behavior',
    'oxygen_dependent',
    'infection_risk',
    'pressure_ulcer_risk',
    'diabetic_foot_risk',
    'custom',
  ] as const);
  const label = getText(formData, 'label', 180);
  const severity = getEnumValue(formData, 'severity', ['low', 'medium', 'high', 'critical'] as const);
  const source = getText(formData, 'source', 120);
  const notes = getText(formData, 'notes', 1200);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !code || !label) {
    throw new Error('Invalid risk flag payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.patientRiskFlag.create({
    data: {
      patientId,
      code,
      label,
      severity: severity ?? undefined,
      source,
      notes,
      flaggedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'risk-flag', tab ?? 'overview');
}

export async function resolveRiskFlagAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const riskFlagId = getText(formData, 'riskFlagId', 64);
  const resolutionNote = getText(formData, 'resolutionNote', 1200);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !riskFlagId) {
    throw new Error('Invalid risk flag resolution payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const existing = await auditedPrisma.patientRiskFlag.findFirst({
    where: { id: riskFlagId, patientId },
    select: { id: true, notes: true, isActive: true },
  });
  if (!existing || !existing.isActive) {
    throw new Error('Risk flag not found or already resolved');
  }

  await auditedPrisma.patientRiskFlag.update({
    where: { id: riskFlagId },
    data: {
      isActive: false,
      resolvedAt: new Date(),
      resolvedByStaffId: session.user.staffId ?? null,
      notes: resolutionNote ? `${existing.notes ? `${existing.notes}\n\n` : ''}Resolution: ${resolutionNote}` : existing.notes,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'risk-resolved', tab ?? 'overview');
}

export async function addCareTaskAction(formData: FormData) {
  const session = await requireStaffPermission('messaging.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const taskType = getEnumValue(formData, 'taskType', [
    'nurse_check',
    'lab_followup',
    'imaging_followup',
    'medication_reminder',
    'physio_exercise',
    'doctor_review',
    'referral',
    'coordination',
    'custom',
  ] as const);
  const title = getText(formData, 'title', 180);
  const description = getText(formData, 'description', 2000);
  const priority = getEnumValue(formData, 'priority', ['routine', 'high', 'urgent', 'critical'] as const);
  const dueAt = getOptionalDate(formData, 'dueAt');
  const assignedToStaffId = getText(formData, 'assignedToStaffId', 64);
  const sourceModule = getText(formData, 'sourceModule', 64);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !taskType || !title) {
    throw new Error('Invalid care task payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.careTask.create({
    data: {
      patientId,
      visitId,
      taskType,
      title,
      description,
      priority: priority ?? undefined,
      dueAt,
      assignedToStaffId,
      sourceModule,
      createdByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'task', tab ?? 'coordination');
}

export async function updateCareTaskStatusAction(formData: FormData) {
  const session = await requireStaffPermission('messaging.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const taskId = getText(formData, 'taskId', 64);
  const status = getEnumValue(formData, 'status', ['open', 'in_progress', 'completed', 'cancelled'] as const);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !taskId || !status) {
    throw new Error('Invalid task status payload');
  }
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.careTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === 'completed' ? new Date() : null,
      closedByStaffId: status === 'completed' ? (session.user.staffId ?? null) : null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'task-status', tab ?? 'coordination');
}

export async function addLabOrderAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const testName = getText(formData, 'testName', 180);
  const clinicalReason = getText(formData, 'clinicalReason', 1200);
  const priority = getEnumValue(formData, 'priority', ['routine', 'high', 'urgent', 'critical'] as const);
  const targetDate = getOptionalDate(formData, 'targetDate');
  const notes = getText(formData, 'notes', 1200);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !testName) throw new Error('Invalid lab order payload');
  if (!(await canAccessPatientRecord(session, patientId))) throw new Error('Forbidden');

  await auditedPrisma.labOrder.create({
    data: {
      patientId,
      visitId,
      testName,
      clinicalReason,
      priority: priority ?? undefined,
      targetDate,
      notes,
      orderedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'lab-order', tab ?? 'doctor');
}

export async function addImagingOrderAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const studyName = getText(formData, 'studyName', 180);
  const modality = getText(formData, 'modality', 80);
  const bodyPart = getText(formData, 'bodyPart', 80);
  const clinicalReason = getText(formData, 'clinicalReason', 1200);
  const priority = getEnumValue(formData, 'priority', ['routine', 'high', 'urgent', 'critical'] as const);
  const targetDate = getOptionalDate(formData, 'targetDate');
  const notes = getText(formData, 'notes', 1200);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !studyName) throw new Error('Invalid imaging order payload');
  if (!(await canAccessPatientRecord(session, patientId))) throw new Error('Forbidden');

  await auditedPrisma.imagingOrder.create({
    data: {
      patientId,
      visitId,
      studyName,
      modality,
      bodyPart,
      clinicalReason,
      priority: priority ?? undefined,
      targetDate,
      notes,
      orderedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'imaging-order', tab ?? 'doctor');
}

export async function addNursingOrderAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const orderTitle = getText(formData, 'orderTitle', 180);
  const instructions = getText(formData, 'instructions', 1600);
  const frequency = getText(formData, 'frequency', 120);
  const startDate = getOptionalDate(formData, 'startDate');
  const endDate = getOptionalDate(formData, 'endDate');
  const priority = getEnumValue(formData, 'priority', ['routine', 'high', 'urgent', 'critical'] as const);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !orderTitle) throw new Error('Invalid nursing order payload');
  if (!(await canAccessPatientRecord(session, patientId))) throw new Error('Forbidden');

  await auditedPrisma.nursingOrder.create({
    data: {
      patientId,
      visitId,
      orderTitle,
      instructions,
      frequency,
      startDate,
      endDate,
      priority: priority ?? undefined,
      orderedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'nursing-order', tab ?? 'doctor');
}

export async function addPhysioOrderAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const orderTitle = getText(formData, 'orderTitle', 180);
  const protocol = getText(formData, 'protocol', 1200);
  const frequency = getText(formData, 'frequency', 120);
  const sessionCount = getOptionalInt(formData, 'sessionCount');
  const goals = getText(formData, 'goals', 1200);
  const priority = getEnumValue(formData, 'priority', ['routine', 'high', 'urgent', 'critical'] as const);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !orderTitle) throw new Error('Invalid physio order payload');
  if (!(await canAccessPatientRecord(session, patientId))) throw new Error('Forbidden');

  await auditedPrisma.physioOrder.create({
    data: {
      patientId,
      visitId,
      orderTitle,
      protocol,
      frequency,
      sessionCount,
      goals,
      priority: priority ?? undefined,
      orderedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'physio-order', tab ?? 'doctor');
}

export async function addMedicationOrderAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'doctor']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const medicationName = getText(formData, 'medicationName', 180);
  const dose = getText(formData, 'dose', 100);
  const frequency = getText(formData, 'frequency', 100);
  const route = getText(formData, 'route', 80);
  const isPrn = getCheckbox(formData, 'isPrn');
  const startDate = getOptionalDate(formData, 'startDate');
  const endDate = getOptionalDate(formData, 'endDate');
  const instructions = getText(formData, 'instructions', 1200);
  const priority = getEnumValue(formData, 'priority', ['routine', 'high', 'urgent', 'critical'] as const);
  const tab = getText(formData, 'tab', 40);

  if (!patientId || !medicationName) throw new Error('Invalid medication order payload');
  if (!(await canAccessPatientRecord(session, patientId))) throw new Error('Forbidden');

  await auditedPrisma.medicationOrder.create({
    data: {
      patientId,
      visitId,
      medicationName,
      dose,
      frequency,
      route,
      isPrn,
      startDate,
      endDate,
      instructions,
      priority: priority ?? undefined,
      orderedByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'medication-order', tab ?? 'doctor');
}

export async function assignStaffToPatientAction(formData: FormData) {
  const session = await requireStaffPermission('admin.manage');
  if (!canBypassPatientAssignment(session)) {
    throw new Error('Forbidden');
  }

  const patientId = getText(formData, 'patientId', 64);
  const staffId = getText(formData, 'staffId', 64);
  const tab = getText(formData, 'tab', 40);
  if (!patientId || !staffId) {
    throw new Error('Invalid assignment payload');
  }

  await prisma.staffPatientAssignment.upsert({
    where: {
      staffId_patientId: {
        staffId,
        patientId,
      },
    },
    update: {
      isActive: true,
      assignedAt: new Date(),
      assignedBy: session.user.staffId ?? session.user.id,
    },
    create: {
      staffId,
      patientId,
      isActive: true,
      assignedBy: session.user.staffId ?? session.user.id,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'assignment', tab ?? 'governance');
}

export async function removeStaffAssignmentAction(formData: FormData) {
  const session = await requireStaffPermission('admin.manage');
  if (!canBypassPatientAssignment(session)) {
    throw new Error('Forbidden');
  }

  const assignmentId = getText(formData, 'assignmentId', 64);
  const patientId = getText(formData, 'patientId', 64);
  const tab = getText(formData, 'tab', 40);
  if (!assignmentId || !patientId) {
    throw new Error('Invalid unassignment payload');
  }

  await prisma.staffPatientAssignment.update({
    where: { id: assignmentId },
    data: { isActive: false },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirectToPatient(patientId, 'assignment-removed', tab ?? 'governance');
}
