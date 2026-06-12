import 'server-only';

import { revalidatePath } from 'next/cache';
import { AuditAction, VisitStatus, VisitState } from '@prisma/client';
import type { StaffRole } from '@prisma/client';
import { ZodError } from 'zod';
import { calculateCancellationFee } from '@/lib/billing/cancellation-policy';
import type { DisruptionCode } from '@/lib/billing/cancellation-policy';
import { calculatePhysioDisruptionPayout } from '@/lib/billing/physio-pay-policy';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import { ensureCachedMedplumPractitionerForStaff, ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { getActivePatientCareTeam } from '@/lib/medplum/care-teams';
import { createPatientTask, listPatientTasks } from '@/lib/medplum/tasks';
import { createPatientCommunication, listPatientCommunications } from '@/lib/medplum/communications';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { ESCALATION_SLA_ACK_MINUTES } from '@/lib/config/nursing-ops-policy';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import type { ActionName } from '@/lib/auth/policy/actions';
import { evaluatePatientGeoPresence } from '@/lib/geo/presence-policy';
import { prisma } from '@/lib/db/prisma';
import { setAdminPatientFlash } from '../flash';

export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB
export const NURSING_HANDOFF_DEFAULT_RADIUS_METERS = 500;
export const NURSING_HANDOFF_MAX_ACCURACY_METERS = 150;
export const VISIT_GEOFENCE_DEFAULT_RADIUS_METERS = 150;
export const VISIT_GEOFENCE_MAX_ACCURACY_METERS = 150;
export const VISIT_CHECKOUT_MIN_DURATION_MINUTES = 5;
export const VISIT_CHECKOUT_DISTANCE_REVIEW_METERS = 500;
export const LATE_CHECKIN_THRESHOLD_MINUTES = 15;
export const NOTE_COSIGN_SLA_HOURS = 24;
export const COSIGN_SLA_BREACH_MARKER = '[co-sign-sla-breach]';
export const LATE_CHECKIN_TASK_MARKER = '[late-checkin]';
export const VISIT_REVIEW_TASK_MARKER = '[visit-review]';
export const PHYSIO_DISCHARGE_REVIEW_MARKER = '[physio-discharge-review]';
export const RESTRICTED_OVERRIDE_WEEKLY_THRESHOLD = 5;
export const RESTRICTED_OVERRIDE_COMPLIANCE_MARKER = '[restricted-override-threshold]';
export const DOCUMENT_DELETE_APPROVAL_TTL_MINUTES = 30;

export const NURSING_SHIFT_WRITE_ROLES: StaffRole[] = ['superadmin', 'admin', 'nurse'];

export type LocalPatientGeoPolicy = {
  localPatientId: string;
  handoffGeofenceRadiusMeters: number | null;
  temporarilyAwayUntil: Date | null;
  temporarilyAwayNote: string | null;
};

export type WorkflowStateValue =
  | 'scheduled'
  | 'acknowledged'
  | 'declined_by_physio'
  | 'cancelled_by_patient'
  | 'cancelled_by_med_ops'
  | 'reassigned_to_other_physio'
  | 'en_route'
  | 'diverted_in_transit'
  | 'arrived'
  | 'refused_at_door'
  | 'patient_not_home'
  | 'checked_in'
  | 'session_interrupted'
  | 'rescheduled_in_place'
  | 'checked_out'
  | 'disputed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const VISIT_STATE_VALUES = new Set<string>(Object.values(VisitState));

/**
 * Narrow a workflow-state label to a persistable `VisitState` enum value.
 * Legacy-only labels ('cancelled', 'no_show') have no enum member and resolve
 * to null, which the nullable `fromState` column accepts. Used so state writes
 * fail loudly on a genuinely-unknown value instead of being silently dropped.
 */
function asVisitState(value: WorkflowStateValue | null | undefined): VisitState | null {
  return value && VISIT_STATE_VALUES.has(value) ? (value as VisitState) : null;
}

export function refreshClinicalPaths(medplumPatientId: string) {
  revalidatePath(`/admin/patients/${medplumPatientId}`);
  revalidatePath('/en/portal');
  revalidatePath('/ar/portal');
}

export function getPatientIdFromFormData(formData: FormData): string {
  return String(formData.get('medplumPatientId') ?? '').trim();
}

export function parseActionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Invalid form input.';
  }
  return error instanceof Error ? error.message : 'Unexpected error. Please try again.';
}

export async function failAction(formData: FormData, error: unknown): Promise<void> {
  const medplumPatientId = getPatientIdFromFormData(formData);
  await setAdminPatientFlash({ type: 'error', message: parseActionError(error) });
  if (medplumPatientId) {
    refreshClinicalPaths(medplumPatientId);
  }
}

export function noteDraftActionForDiscipline(discipline: 'nursing' | 'physiotherapy' | 'medical'): ActionName {
  if (discipline === 'nursing') return 'note.nursing.create_draft';
  if (discipline === 'physiotherapy') return 'note.physio.create_draft';
  return 'note.medical.create_draft';
}

export function noteSignActionForDiscipline(discipline: 'nursing' | 'physiotherapy' | 'medical'): ActionName {
  if (discipline === 'nursing') return 'note.nursing.sign';
  if (discipline === 'physiotherapy') return 'note.physio.sign';
  return 'note.medical.sign';
}

export async function requireAdminPatientAction(
  action: ActionName,
  medplumPatientId: string,
  auditTableName = 'admin_patient_action',
): Promise<void> {
  await requireStaffCan(action, {
    targetPatientMedplumId: medplumPatientId,
    audit: {
      tableName: auditTableName,
      recordId: medplumPatientId,
    },
  });
}

export async function getClinicalWriterWithPractitioner() {
  const staff = await getSessionUser();
  if (!isStaff(staff) || !staff.staffId || !staff.staffRole) {
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

export async function getCoordinationWriterWithPractitioner() {
  const staff = await getSessionUser();
  if (!isStaff(staff) || !staff.staffId || !staff.staffRole) {
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

export async function resolvePractitionerFromStaffId(staffId?: string | null) {
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

export async function getLocalPatientGeoPolicy(medplumPatientId: string): Promise<LocalPatientGeoPolicy | null> {
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

export async function getWorkflowVisitOrThrow(params: {
  visitId: string;
  medplumPatientId: string;
}) {
  const visit = await prisma.visit.findUnique({
    where: { id: params.visitId },
    select: {
      id: true,
      code: true,
      providerId: true,
      status: true,
      scheduledDate: true,
      scheduledTime: true,
      servicePriceEgp: true,
      discountEgp: true,
      netPriceEgp: true,
      providerPayoutEgp: true,
      acknowledgedAt: true,
      enRouteAt: true,
      arrivedAt: true,
      checkInAt: true,
      checkInLat: true,
      checkInLng: true,
      checkOutAt: true,
      patient: {
        select: {
          medplumPatientId: true,
        },
      },
    },
  });

  if (!visit) {
    throw new Error('Visit record not found.');
  }

  if (visit.patient.medplumPatientId !== params.medplumPatientId) {
    throw new Error('Visit does not belong to this patient.');
  }

  return visit;
}

export function deriveWorkflowStateFromLegacy(visit: {
  status: VisitStatus;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): WorkflowStateValue {
  if (visit.status === VisitStatus.cancelled) {
    return 'cancelled';
  }
  if (visit.status === VisitStatus.no_show) {
    return 'no_show';
  }
  if (visit.status === VisitStatus.completed) {
    return 'completed';
  }
  if (visit.checkOutAt) {
    return 'checked_out';
  }
  if (visit.checkInAt) {
    return 'checked_in';
  }
  if (visit.arrivedAt) {
    return 'arrived';
  }
  if (visit.enRouteAt) {
    return 'en_route';
  }
  if (visit.acknowledgedAt) {
    return 'acknowledged';
  }
  return 'scheduled';
}

export async function readCurrentWorkflowState(visit: {
  id: string;
  status: VisitStatus;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): Promise<WorkflowStateValue> {
  const row = await prisma.visit.findUnique({
    where: { id: visit.id },
    select: { state: true },
  });
  if (row?.state) {
    return row.state as unknown as WorkflowStateValue;
  }

  return deriveWorkflowStateFromLegacy(visit);
}

export async function persistWorkflowStateTransition(params: {
  visit: {
    id: string;
    status: VisitStatus;
    acknowledgedAt: Date | null;
    enRouteAt: Date | null;
    arrivedAt: Date | null;
    checkInAt: Date | null;
    checkOutAt: Date | null;
  };
  toState: WorkflowStateValue;
  changedBy: string;
  reasonCode?: DisruptionCode | null;
  reasonNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  isOverride?: boolean;
  overrideMethod?: string | null;
}): Promise<void> {
  const fromState = await readCurrentWorkflowState(params.visit);
  const toState = asVisitState(params.toState);
  if (!toState) {
    throw new Error(`Cannot persist unknown visit workflow state "${params.toState}".`);
  }

  // Update the visit's current state and append the immutable ledger row in a
  // single transaction so the state column and the transition history can never
  // diverge. Both writes must succeed — failures surface, never get swallowed.
  await prisma.$transaction([
    prisma.visit.update({
      where: { id: params.visit.id },
      data: { state: toState },
    }),
    prisma.visitStateTransition.create({
      data: {
        visitId: params.visit.id,
        fromState: asVisitState(fromState),
        toState,
        actorStaffId: params.changedBy,
        actorSystem: false,
        reasonCode: params.reasonCode ?? null,
        reasonNote: params.reasonNote ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        accuracyMeters: params.accuracyMeters ?? null,
        isOverride: Boolean(params.isOverride),
        overrideMethod: params.overrideMethod ?? null,
      },
    }),
  ]);
}

export function parseScheduledVisitDateTime(visit: {
  scheduledDate: Date;
  scheduledTime: string | null;
}): Date {
  const base = new Date(visit.scheduledDate);
  const scheduledTime = (visit.scheduledTime ?? '').trim();
  if (!scheduledTime) {
    return base;
  }

  const [hoursRaw, minutesRaw] = scheduledTime.split(':');
  const hours = Number(hoursRaw ?? '0');
  const minutes = Number(minutesRaw ?? '0');

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return base;
  }

  const scheduled = new Date(base);
  scheduled.setHours(Math.max(0, Math.min(23, hours)), Math.max(0, Math.min(59, minutes)), 0, 0);
  return scheduled;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function minutesBeforeScheduledStart(scheduledAt: Date, eventAt: Date): number | null {
  const deltaMs = scheduledAt.getTime() - eventAt.getTime();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  return Math.round(deltaMs / 60000);
}

export async function applyDisruptionFinancials(params: {
  visit: {
    id: string;
    scheduledDate: Date;
    scheduledTime: string | null;
    servicePriceEgp: unknown;
    providerPayoutEgp: unknown;
  };
  eventAt: Date;
  disruptionCode: DisruptionCode;
}): Promise<void> {
  const servicePrice = Number(params.visit.servicePriceEgp ?? 0);
  const plannedPayout = Number(params.visit.providerPayoutEgp ?? 0);
  const scheduledAt = parseScheduledVisitDateTime({
    scheduledDate: params.visit.scheduledDate,
    scheduledTime: params.visit.scheduledTime,
  });

  const { feeEgp } = calculateCancellationFee({
    servicePriceEgp: servicePrice,
    disruptionCode: params.disruptionCode,
    minutesBeforeScheduledStart: minutesBeforeScheduledStart(scheduledAt, params.eventAt),
  });

  const { payoutEgp } = calculatePhysioDisruptionPayout({
    plannedPayoutEgp: plannedPayout,
    disruptionCode: params.disruptionCode,
  });

  const nextNetPrice = roundMoney(Math.max(servicePrice - feeEgp, 0));

  await prisma.visit.update({
    where: { id: params.visit.id },
    data: {
      discountEgp: feeEgp,
      netPriceEgp: nextNetPrice,
      providerPayoutEgp: payoutEgp,
    },
  });
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function haversineDistanceMeters(params: {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}): number {
  const r = 6371000;
  const dLat = ((params.lat2 - params.lat1) * Math.PI) / 180;
  const dLng = ((params.lng2 - params.lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos((params.lat1 * Math.PI) / 180)
    * Math.cos((params.lat2 * Math.PI) / 180)
    * Math.sin(dLng / 2)
    * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

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
  const [vitals, notes, assessments] = await Promise.all([
    listRecentPatientVitals(params.medplumPatientId, 80),
    listPatientClinicalNotes(params.medplumPatientId, 80, { signedOnly: true }),
    listPatientAssessments(params.medplumPatientId, 80),
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

  if (!hasVitals && !hasSignedNote && !hasAssessment) {
    throw new Error('Check-out requires at least one signed clinical entry (vitals, note, or assessment) during this visit window.');
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

export async function resolveDoctorOwnerReference(patientId: string): Promise<{ reference: string; display?: string } | null> {
  const careTeam = await getActivePatientCareTeam(patientId);
  const doctorParticipant = careTeam?.participant?.find((participant) => {
    const roleCode = participant.role?.[0]?.coding?.[0]?.code;
    return roleCode === 'doctor';
  });

  const reference = doctorParticipant?.member?.reference;
  if (!reference) {
    return null;
  }

  return {
    reference,
    display: doctorParticipant?.member?.display ?? undefined,
  };
}

export async function resolveComplianceOwnerReference(): Promise<{ reference: string; display?: string } | null> {
  const compliance = await prisma.staff.findFirst({
    where: {
      role: 'compliance_officer',
      status: 'active',
      medplumPractitionerId: {
        not: null,
      },
    },
    select: {
      medplumPractitionerId: true,
      name: true,
    },
  });

  if (!compliance?.medplumPractitionerId) {
    return null;
  }

  return {
    reference: `Practitioner/${compliance.medplumPractitionerId}`,
    display: compliance.name,
  };
}

export async function resolveAdminOwnerReferences(): Promise<Array<{ reference: string; display?: string }>> {
  const admins = await prisma.staff.findMany({
    where: {
      role: {
        in: ['admin', 'superadmin'],
      },
      status: 'active',
      medplumPractitionerId: {
        not: null,
      },
    },
    select: {
      medplumPractitionerId: true,
      name: true,
    },
    take: 5,
  });

  return admins
    .filter((entry) => !!entry.medplumPractitionerId)
    .map((entry) => ({
      reference: `Practitioner/${entry.medplumPractitionerId as string}`,
      display: entry.name,
    }));
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

export async function evaluateVisitGeofence(params: {
  medplumPatientId: string;
  role: StaffRole | null | undefined;
  purpose: 'checkin' | 'checkout';
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}) {
  const policy = await getLocalPatientGeoPolicy(params.medplumPatientId);
  const maxDistanceMeters = policy?.handoffGeofenceRadiusMeters ?? VISIT_GEOFENCE_DEFAULT_RADIUS_METERS;

  const purpose = params.purpose === 'checkout'
    ? 'visit-checkout'
    : (params.role === 'physiotherapist' ? 'physio-visit-checkin' : 'doctor-visit-checkin');

  const evaluation = await evaluatePatientGeoPresence({
    patientId: params.medplumPatientId,
    purpose,
    currentLocation: {
      latitude: params.latitude,
      longitude: params.longitude,
    },
    accuracyMeters: params.accuracyMeters,
    policy: {
      maxDistanceMeters,
      maxAccuracyMeters: VISIT_GEOFENCE_MAX_ACCURACY_METERS,
    },
  });

  return evaluation;
}

export function isClosedVisitStatus(status: VisitStatus): boolean {
  return status === VisitStatus.cancelled || status === VisitStatus.completed || status === VisitStatus.no_show;
}

export async function createEscalationAndCommunication(params: {
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

export async function hasRecentOpenVitalsAutoEscalation(medplumPatientId: string): Promise<boolean> {
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

export async function runEscalationSlaSweepForPatient(
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

export async function runCoSignSlaSweepForPatient(
  medplumPatientId: string,
  sender: { reference: string; display: string },
): Promise<number> {
  const tasks = await listPatientTasks(medplumPatientId, 200);
  const communications = await listPatientCommunications(medplumPatientId, 200);
  const nowMs = Date.now();

  let breachedCount = 0;

  for (const task of tasks) {
    if (task.code?.coding?.[0]?.code !== 'co-sign') {
      continue;
    }

    if (['completed', 'cancelled'].includes(task.status)) {
      continue;
    }

    const dueMs = task.executionPeriod?.end ? new Date(task.executionPeriod.end).getTime() : NaN;
    if (!Number.isFinite(dueMs) || dueMs > nowMs) {
      continue;
    }

    const alreadyRaised = communications.some(
      (item) =>
        item.category === 'escalation' &&
        item.basedOnTaskId === (task.id ?? null) &&
        item.message.includes(COSIGN_SLA_BREACH_MARKER),
    );

    if (alreadyRaised) {
      continue;
    }

    const summary = `${COSIGN_SLA_BREACH_MARKER} Co-sign SLA breach: task ${task.id ?? 'unknown'} passed the 24-hour deadline without completion.`;

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

export async function assertRosteredNurseForPatientIfNurse(
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

