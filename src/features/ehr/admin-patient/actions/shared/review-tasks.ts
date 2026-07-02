import 'server-only';

import { AuditAction } from '@prisma/client';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import { listPatientCareReports } from '@/lib/medplum/care-reports';
import { createPatientTask, listPatientTasks } from '@/lib/medplum/tasks';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { prisma } from '@/lib/db/prisma';
import {
  LATE_CHECKIN_THRESHOLD_MINUTES,
  LATE_CHECKIN_TASK_MARKER,
  VISIT_REVIEW_TASK_MARKER,
  VISIT_CHECKOUT_MIN_DURATION_MINUTES,
  VISIT_CHECKOUT_DISTANCE_REVIEW_METERS,
} from './constants';
import { haversineDistanceMeters } from './geo';
import { resolveDoctorOwnerReference } from './owner-references';

export async function hasOpenPatientTaskByMarker(params: {
  medplumPatientId: string;
  marker: string;
  code: string;
}): Promise<boolean> {
  const tasks = await listPatientTasks(params.medplumPatientId, 120);
  return tasks.some((task) => {
    const open = !['completed', 'cancelled'].includes(task.status);
    const matchesCode = task.code?.coding?.[0]?.code === params.code;
    return open && matchesCode && (task.description ?? '').includes(params.marker);
  });
}

export async function createPatientReviewTask(params: {
  medplumPatientId: string;
  title: string;
  description: string;
  taskCode: string;
  marker: string;
  changedBy: string;
  ownerReference?: string | null;
  ownerDisplay?: string | null;
}): Promise<void> {
  const exists = await hasOpenPatientTaskByMarker({
    medplumPatientId: params.medplumPatientId,
    marker: params.marker,
    code: params.taskCode,
  });

  if (exists) {
    return;
  }

  const task = await createPatientTask({
    patientId: params.medplumPatientId,
    taskCode: params.taskCode,
    priority: 'urgent',
    title: params.title,
    description: `${params.marker} ${params.description}`,
    ownerReference: params.ownerReference ?? null,
    ownerDisplay: params.ownerDisplay ?? null,
  });

  await writeMedplumAuditMirror({
    tableName: 'MedplumTask',
    recordId: task.id ?? `${params.medplumPatientId}:${Date.now()}`,
    action: AuditAction.create,
    changedFields: ['status', 'priority', 'code', 'description', 'for', 'owner'],
    changedBy: params.changedBy,
  });
}

export async function maybeCreateLateCheckInTask(params: {
  medplumPatientId: string;
  visitId: string;
  scheduledAt: Date;
  checkedInAt: Date;
  hadEnRoute: boolean;
  changedBy: string;
}): Promise<void> {
  if (params.hadEnRoute) {
    return;
  }

  const thresholdMs = LATE_CHECKIN_THRESHOLD_MINUTES * 60 * 1000;
  if (params.checkedInAt.getTime() - params.scheduledAt.getTime() <= thresholdMs) {
    return;
  }

  await createPatientReviewTask({
    medplumPatientId: params.medplumPatientId,
    taskCode: 'dispatch-review',
    marker: `${LATE_CHECKIN_TASK_MARKER}:${params.visitId}`,
    title: 'Late check-in review required',
    description: `Visit ${params.visitId} checked in without an en-route ping after the ${LATE_CHECKIN_THRESHOLD_MINUTES}-minute threshold.`,
    changedBy: params.changedBy,
  });
}

export async function assertVisitHasClinicalEvidence(params: {
  medplumPatientId: string;
  startedAt: Date;
  endedAt: Date;
}): Promise<void> {
  const [vitals, notes, assessments, careReports] = await Promise.all([
    listRecentPatientVitals(params.medplumPatientId, 80),
    listPatientClinicalNotes(params.medplumPatientId, 80, { signedOnly: true }),
    listPatientAssessments(params.medplumPatientId, 80),
    listPatientCareReports(params.medplumPatientId, 80),
  ]);

  const inWindow = (value: string | Date | null | undefined): boolean => {
    if (!value) {
      return false;
    }
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) {
      return false;
    }
    return time >= params.startedAt.getTime() && time <= params.endedAt.getTime();
  };

  const hasVitals = vitals.some((item) => inWindow(item.measuredAt));
  const hasSignedNote = notes.some((item) => inWindow(item.date));
  const hasAssessment = assessments.some((item) => inWindow(item.authored));
  // A structured physio/nursing session report (category `survey`) is a signed
  // clinical entry too — without this the physio session note (the physio's only
  // documentation surface) never satisfies the check-out gate.
  const hasCareReport = careReports.some((item) => inWindow(item.effectiveDateTime));

  if (!hasVitals && !hasSignedNote && !hasAssessment && !hasCareReport) {
    throw new Error('Check-out requires at least one signed clinical entry (vitals, note, assessment, or session report) during this visit window.');
  }
}

export async function maybeCreateCheckoutReviewTasks(params: {
  medplumPatientId: string;
  visitId: string;
  checkInAt: Date;
  checkOutAt: Date;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number;
  checkOutLng: number;
  changedBy: string;
}): Promise<void> {
  const durationMinutes = (params.checkOutAt.getTime() - params.checkInAt.getTime()) / (60 * 1000);

  if (durationMinutes < VISIT_CHECKOUT_MIN_DURATION_MINUTES) {
    await createPatientReviewTask({
      medplumPatientId: params.medplumPatientId,
      taskCode: 'visit-review',
      marker: `${VISIT_REVIEW_TASK_MARKER}:short:${params.visitId}`,
      title: 'Short visit duration review',
      description: `Visit ${params.visitId} was completed in ${durationMinutes.toFixed(1)} minutes (< ${VISIT_CHECKOUT_MIN_DURATION_MINUTES} minutes).`,
      changedBy: params.changedBy,
    });
  }

  if (params.checkInLat === null || params.checkInLng === null) {
    return;
  }

  const displacement = haversineDistanceMeters({
    lat1: params.checkInLat,
    lng1: params.checkInLng,
    lat2: params.checkOutLat,
    lng2: params.checkOutLng,
  });

  if (displacement > VISIT_CHECKOUT_DISTANCE_REVIEW_METERS) {
    await createPatientReviewTask({
      medplumPatientId: params.medplumPatientId,
      taskCode: 'visit-review',
      marker: `${VISIT_REVIEW_TASK_MARKER}:distance:${params.visitId}`,
      title: 'Check-out location variance review',
      description: `Visit ${params.visitId} check-out location differed from check-in by ${Math.round(displacement)}m (> ${VISIT_CHECKOUT_DISTANCE_REVIEW_METERS}m).`,
      changedBy: params.changedBy,
    });
  }
}

export async function writeVisitWorkflowAudit(params: {
  visitId: string;
  changedBy: string;
  changedFields: string[];
}) {
  // TODO(audit): centralize when extension is wired.
  await prisma.auditLog.create({
    data: {
      tableName: 'visits',
      recordId: params.visitId,
      action: AuditAction.update,
      changedFields: params.changedFields,
      changedBy: params.changedBy,
    },
  });
}

export function detectCoSignFlags(text: string): string[] {
  const normalized = text.toLowerCase();
  const flags: Array<{ key: string; patterns: string[] }> = [
    { key: 'fall_event', patterns: ['fall', 'slip'] },
    { key: 'med_error', patterns: ['med error', 'medication error'] },
    { key: 'controlled_substance', patterns: ['controlled substance', 'narcotic', 'opioid'] },
    { key: 'refusal_of_care', patterns: ['refusal of care', 'refused care'] },
  ];

  return flags.filter((flag) => flag.patterns.some((pattern) => normalized.includes(pattern))).map((flag) => flag.key);
}

export function detectPhysioRedFlags(text: string): string[] {
  const normalized = text.toLowerCase();
  const flags: Array<{ key: string; patterns: string[] }> = [
    { key: 'possible_dvt', patterns: ['calf swelling', 'calf redness', 'calf pain', 'unilateral swelling'] },
    { key: 'possible_cauda_equina', patterns: ['saddle anesthesia', 'loss of bladder', 'loss of bowel', 'urinary retention'] },
    { key: 'possible_stroke_progression', patterns: ['new weakness', 'facial droop', 'slurred speech'] },
    { key: 'neurological_red_flag', patterns: ['new numbness', 'progressive weakness', 'foot drop'] },
    { key: 'respiratory_distress', patterns: ['shortness of breath', 'chest pain', 'oxygen drop'] },
  ];

  return flags.filter((flag) => flag.patterns.some((pattern) => normalized.includes(pattern))).map((flag) => flag.key);
}

export async function maybeCreatePhysioRedFlagEscalation(params: {
  medplumPatientId: string;
  markerId: string;
  noteBody: string;
  subjectiveFunction?: string | null;
  responseSummary?: string | null;
  changedBy: string;
}): Promise<void> {
  const combinedText = [params.noteBody, params.subjectiveFunction ?? '', params.responseSummary ?? '']
    .join(' ')
    .trim();

  if (!combinedText) {
    return;
  }

  const redFlags = detectPhysioRedFlags(combinedText);
  if (redFlags.length === 0) {
    return;
  }

  const owner = await resolveDoctorOwnerReference(params.medplumPatientId);

  await createPatientReviewTask({
    medplumPatientId: params.medplumPatientId,
    taskCode: 'escalation',
    marker: `[physio-red-flag]:${params.markerId}`,
    title: 'Physio red-flag escalation review',
    description: `Auto-detected red flags from physio note: ${redFlags.join(', ')}. Review within 4 hours.`,
    changedBy: params.changedBy,
    ownerReference: owner?.reference ?? null,
    ownerDisplay: owner?.display ?? null,
  });
}

export async function hasOpenCoSignTaskForNote(patientId: string, compositionId: string): Promise<boolean> {
  const tasks = await listPatientTasks(patientId, 120);
  return tasks.some((task) => {
    const open = !['completed', 'cancelled'].includes(task.status);
    const isCosign = task.code?.coding?.[0]?.code === 'co-sign';
    const linkedNote = (task.description ?? '').includes(`[note:${compositionId}]`);
    return open && isCosign && linkedNote;
  });
}
