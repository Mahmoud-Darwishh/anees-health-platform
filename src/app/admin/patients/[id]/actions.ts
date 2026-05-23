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

export async function updatePatientCoreAction(formData: FormData) {
  const session = await requireStaffPermission('patients.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  if (!patientId) throw new Error('Invalid patient');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const status = getText(formData, 'status', 20);
  const chiefComplaint = getText(formData, 'chiefComplaint', 500);
  const notes = getText(formData, 'notes', 2000);

  await auditedPrisma.patient.update({
    where: { id: patientId },
    data: {
      ...(status ? { status: status as 'new' | 'active' | 'lapsed' | 'inactive' } : {}),
      chiefComplaint,
      notes,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=core`);
}

export async function addAllergyAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const allergen = getText(formData, 'allergen', 140);
  const reaction = getText(formData, 'reaction', 300);
  const severity = getText(formData, 'severity', 40);
  const notes = getText(formData, 'notes', 1000);

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
  redirect(`/admin/patients/${patientId}?updated=allergy`);
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
  redirect(`/admin/patients/${patientId}?updated=medication`);
}

export async function addProgressNoteAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const noteBody = getText(formData, 'noteBody', 8000);
  const signedOff = formData.get('signedOff') === 'on';

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
  redirect(`/admin/patients/${patientId}?updated=progress-note`);
}

export async function signProgressNoteAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const progressNoteId = getText(formData, 'progressNoteId', 64);

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
  redirect(`/admin/patients/${patientId}?updated=progress-note-signed`);
}

export async function addProgressNoteAddendumAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const progressNoteId = getText(formData, 'progressNoteId', 64);
  const addendumBody = getText(formData, 'addendumBody', 4000);

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
  redirect(`/admin/patients/${patientId}?updated=progress-note-addendum`);
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
  redirect(`/admin/patients/${patientId}?updated=diagnosis`);
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
  redirect(`/admin/patients/${patientId}?updated=physio`);
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
  redirect(`/admin/patients/${patientId}?updated=nurse-report`);
}

export async function addVitalSignsAction(formData: FormData) {
  const session = await requireStaffPermission('nursing.write');
  assertStaffRoleAllowed(session.user.staffRole, ['superadmin', 'admin', 'nurse']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const measuredAt = getOptionalDate(formData, 'measuredAt') ?? new Date();

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
  redirect(`/admin/patients/${patientId}?updated=vitals`);
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
  redirect(`/admin/patients/${patientId}?updated=care-message`);
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
  redirect(`/admin/patients/${patientId}?updated=call-routing`);
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
  redirect(`/admin/patients/${patientId}?updated=ai-triage`);
}

export async function assignStaffToPatientAction(formData: FormData) {
  const session = await requireStaffPermission('admin.manage');
  if (!canBypassPatientAssignment(session)) {
    throw new Error('Forbidden');
  }

  const patientId = getText(formData, 'patientId', 64);
  const staffId = getText(formData, 'staffId', 64);
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
  redirect(`/admin/patients/${patientId}?updated=assignment`);
}

export async function removeStaffAssignmentAction(formData: FormData) {
  const session = await requireStaffPermission('admin.manage');
  if (!canBypassPatientAssignment(session)) {
    throw new Error('Forbidden');
  }

  const assignmentId = getText(formData, 'assignmentId', 64);
  const patientId = getText(formData, 'patientId', 64);
  if (!assignmentId || !patientId) {
    throw new Error('Invalid unassignment payload');
  }

  await prisma.staffPatientAssignment.update({
    where: { id: assignmentId },
    data: { isActive: false },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=assignment-removed`);
}
