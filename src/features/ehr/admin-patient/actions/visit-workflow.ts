'use server';

import { AuditAction, VisitStatus } from '@prisma/client';
import type { DisruptionCode } from '@/lib/billing/cancellation-policy';
import { createMedplumEncounter } from '@/lib/medplum/encounters';
import type { MedplumEncounterStatus } from '@/lib/medplum/encounters';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { prisma } from '@/lib/db/prisma';
import { formDataToInput, acknowledgeVisitSchema, startTravelSchema, markArrivedSchema, checkInVisitSchema, checkOutVisitSchema, cancelVisitByPatientSchema, cancelVisitByMedOpsSchema, declineVisitSchema, reassignVisitSchema, markRefusedAtDoorSchema, markPatientNotHomeSchema, divertVisitSchema, interruptSessionSchema, rescheduleInPlaceSchema, disputeVisitSchema, recordVisitSchema } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { WorkflowStateValue, refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, getCoordinationWriterWithPractitioner, getWorkflowVisitOrThrow, persistWorkflowStateTransition, parseScheduledVisitDateTime, applyDisruptionFinancials, toNumber, createPatientReviewTask, maybeCreateLateCheckInTask, assertVisitHasClinicalEvidence, maybeCreateCheckoutReviewTasks, writeVisitWorkflowAudit, evaluateVisitGeofence, isClosedVisitStatus } from './shared';

export async function recordVisitAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = recordVisitSchema.parse(formDataToInput(formData));
    const medplumPatientId = input.medplumPatientId;
    await requireAdminPatientAction('visit.schedule.update', medplumPatientId, 'visits');
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

export async function acknowledgeVisitAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = acknowledgeVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.acknowledge', input.medplumPatientId, 'visits');
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be acknowledged in its current status.');
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        acknowledgedAt: input.acknowledgedAt,
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'acknowledged',
      changedBy,
    });

    await writeVisitWorkflowAudit({
      visitId: visit.id,
      changedBy,
      changedFields: ['acknowledgedAt', 'state'],
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit acknowledged.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function startTravelAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = startTravelSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.start_travel', input.medplumPatientId, 'visits');
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!visit.acknowledgedAt) {
      throw new Error('Visit must be acknowledged before starting travel.');
    }

    if (isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot start travel in its current status.');
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        enRouteAt: input.enRouteAt,
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'en_route',
      changedBy,
    });

    await writeVisitWorkflowAudit({
      visitId: visit.id,
      changedBy,
      changedFields: ['enRouteAt', 'state'],
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit marked as en-route.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function markArrivedAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = markArrivedSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.mark_arrived', input.medplumPatientId, 'visits');
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!visit.enRouteAt) {
      throw new Error('Visit must be en-route before arrival can be marked.');
    }

    if (isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be marked as arrived in its current status.');
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        arrivedAt: input.arrivedAt,
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'arrived',
      changedBy,
    });

    await writeVisitWorkflowAudit({
      visitId: visit.id,
      changedBy,
      changedFields: ['arrivedAt', 'state'],
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit marked as arrived.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function checkInVisitAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = checkInVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.check_in', input.medplumPatientId, 'visits');
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!visit.arrivedAt && !visit.enRouteAt) {
      throw new Error('Visit must be in travel/arrival flow before check-in.');
    }

    if (isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be checked in in its current status.');
    }

    const geofenceEvaluation = await evaluateVisitGeofence({
      medplumPatientId: input.medplumPatientId,
      role: staff.staffRole,
      purpose: 'checkin',
      latitude: input.checkInLatitude,
      longitude: input.checkInLongitude,
      accuracyMeters: input.checkInAccuracyMeters,
    });

    const isOverride = !geofenceEvaluation.allowed;
    if (isOverride) {
      if (!input.geofenceOverrideMethod) {
        throw new Error(
          `${geofenceEvaluation.failureReason ?? 'Visit geo-presence check failed.'} Add an approved override method to continue.`,
        );
      }
      if (!input.geofenceOverrideReason || input.geofenceOverrideReason.trim().length < 6) {
        throw new Error('Override reason is required (minimum 6 characters) when geofence validation fails.');
      }
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        status: VisitStatus.in_progress,
        checkInAt: input.checkInAt,
        checkInLat: input.checkInLatitude,
        checkInLng: input.checkInLongitude,
        checkInAccuracyM: input.checkInAccuracyMeters,
        geofencePassed: geofenceEvaluation.allowed,
        geofenceOverrideMethod: isOverride ? input.geofenceOverrideMethod ?? null : null,
        overridePhotoMediaId: isOverride ? input.geofenceOverrideMediaId ?? null : null,
      },
    });

    const scheduledAt = parseScheduledVisitDateTime({
      scheduledDate: visit.scheduledDate,
      scheduledTime: visit.scheduledTime,
    });
    await maybeCreateLateCheckInTask({
      medplumPatientId: input.medplumPatientId,
      visitId: visit.id,
      scheduledAt,
      checkedInAt: input.checkInAt,
      hadEnRoute: Boolean(visit.enRouteAt),
      changedBy,
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'checked_in',
      changedBy,
      reasonNote: isOverride
        ? `${input.geofenceOverrideReason ?? ''} (${geofenceEvaluation.failureReason ?? 'geo override'})`
        : null,
      latitude: input.checkInLatitude,
      longitude: input.checkInLongitude,
      accuracyMeters: input.checkInAccuracyMeters,
      isOverride,
      overrideMethod: isOverride ? input.geofenceOverrideMethod ?? null : null,
    });

    await writeVisitWorkflowAudit({
      visitId: visit.id,
      changedBy,
      changedFields: [
        'status',
        'state',
        'checkInAt',
        'checkInLat',
        'checkInLng',
        'checkInAccuracyM',
        'geofencePassed',
        'geofenceOverrideMethod',
        'overridePhotoMediaId',
      ],
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit checked in.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function checkOutVisitAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = checkOutVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.check_out', input.medplumPatientId, 'visits');
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!visit.checkInAt) {
      throw new Error('Visit must be checked in before check-out.');
    }

    if (isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be checked out in its current status.');
    }

    const geofenceEvaluation = await evaluateVisitGeofence({
      medplumPatientId: input.medplumPatientId,
      role: staff.staffRole,
      purpose: 'checkout',
      latitude: input.checkOutLatitude,
      longitude: input.checkOutLongitude,
      accuracyMeters: input.checkOutAccuracyMeters,
    });

    if (!geofenceEvaluation.allowed) {
      throw new Error(geofenceEvaluation.failureReason ?? 'Visit geo-presence check failed.');
    }

    await assertVisitHasClinicalEvidence({
      medplumPatientId: input.medplumPatientId,
      startedAt: visit.checkInAt,
      endedAt: input.checkOutAt,
    });

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        status: VisitStatus.completed,
        checkOutAt: input.checkOutAt,
        checkOutLat: input.checkOutLatitude,
        checkOutLng: input.checkOutLongitude,
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'checked_out',
      changedBy,
      latitude: input.checkOutLatitude,
      longitude: input.checkOutLongitude,
      accuracyMeters: input.checkOutAccuracyMeters,
    });

    await maybeCreateCheckoutReviewTasks({
      medplumPatientId: input.medplumPatientId,
      visitId: visit.id,
      checkInAt: visit.checkInAt,
      checkOutAt: input.checkOutAt,
      checkInLat: toNumber(visit.checkInLat),
      checkInLng: toNumber(visit.checkInLng),
      checkOutLat: input.checkOutLatitude,
      checkOutLng: input.checkOutLongitude,
      changedBy,
    });

    await writeVisitWorkflowAudit({
      visitId: visit.id,
      changedBy,
      changedFields: ['status', 'state', 'checkOutAt', 'checkOutLat', 'checkOutLng'],
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit checked out and marked completed.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

async function applyVisitDisruptionTransition(params: {
  medplumPatientId: string;
  visitId: string;
  toState: WorkflowStateValue;
  nextStatus?: VisitStatus;
  eventAt: Date;
  disruptionCode: DisruptionCode;
  disruptionNote?: string | null;
  reassignedProviderId?: string | null;
  nextScheduledDate?: Date | null;
  nextScheduledTime?: string | null;
  changedBy: string;
}): Promise<void> {
  const visit = await getWorkflowVisitOrThrow({
    visitId: params.visitId,
    medplumPatientId: params.medplumPatientId,
  });

  const updatePayload: {
    status?: VisitStatus;
    providerId?: string | null;
    scheduledDate?: Date;
    scheduledTime?: string;
    primaryDisruptionCode?: DisruptionCode;
  } = {
    primaryDisruptionCode: params.disruptionCode,
  };

  if (params.nextStatus) {
    updatePayload.status = params.nextStatus;
  }

  if (params.reassignedProviderId !== undefined) {
    updatePayload.providerId = params.reassignedProviderId;
  }

  if (params.nextScheduledDate && params.nextScheduledTime) {
    updatePayload.scheduledDate = params.nextScheduledDate;
    updatePayload.scheduledTime = params.nextScheduledTime;
  }

  await prisma.visit.update({
    where: { id: visit.id },
    data: updatePayload,
  });

  await applyDisruptionFinancials({
    visit,
    eventAt: params.eventAt,
    disruptionCode: params.disruptionCode,
  });

  await persistWorkflowStateTransition({
    visit,
    toState: params.toState,
    changedBy: params.changedBy,
    reasonCode: params.disruptionCode,
    reasonNote: params.disruptionNote ?? null,
  });

  await writeVisitWorkflowAudit({
    visitId: visit.id,
    changedBy: params.changedBy,
    changedFields: ['status', 'state', 'primaryDisruptionCode', 'discountEgp', 'netPriceEgp', 'providerPayoutEgp'],
  });
}

export async function cancelVisitByPatientAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = cancelVisitByPatientSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.schedule.update', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'cancelled_by_patient',
      nextStatus: VisitStatus.cancelled,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit cancelled by patient.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function cancelVisitByMedOpsAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = cancelVisitByMedOpsSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.schedule.update', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'cancelled_by_med_ops',
      nextStatus: VisitStatus.cancelled,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit cancelled by Med Ops.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function declineVisitAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = declineVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.decline', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'declined_by_physio',
      nextStatus: VisitStatus.cancelled,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit declined by clinician.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function reassignVisitAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = reassignVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.schedule.update', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'reassigned_to_other_physio',
      nextStatus: VisitStatus.rescheduled,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      reassignedProviderId: input.reassignedProviderId ?? null,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit reassigned.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function markRefusedAtDoorAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = markRefusedAtDoorSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.mark_refused_at_door', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'refused_at_door',
      nextStatus: VisitStatus.no_show,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit marked as refused at door.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function markPatientNotHomeAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = markPatientNotHomeSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.mark_patient_not_home', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'patient_not_home',
      nextStatus: VisitStatus.no_show,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit marked as patient not home.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function divertVisitAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = divertVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.schedule.update', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'diverted_in_transit',
      nextStatus: VisitStatus.rescheduled,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit diverted and queued for reschedule.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function interruptSessionAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = interruptSessionSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.workflow.update', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'session_interrupted',
      nextStatus: VisitStatus.in_progress,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Session interruption logged.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function rescheduleInPlaceAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = rescheduleInPlaceSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.schedule.update', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'rescheduled_in_place',
      nextStatus: VisitStatus.rescheduled,
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      nextScheduledDate: input.nextScheduledDate,
      nextScheduledTime: input.nextScheduledTime,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit rescheduled in place.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function disputeVisitAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = disputeVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.dispute', input.medplumPatientId, 'visits');

    await applyVisitDisruptionTransition({
      medplumPatientId: input.medplumPatientId,
      visitId: input.visitId,
      toState: 'disputed',
      eventAt: input.eventAt,
      disruptionCode: input.disruptionCode,
      disruptionNote: input.disruptionNote,
      changedBy,
    });

    await createPatientReviewTask({
      medplumPatientId: input.medplumPatientId,
      taskCode: 'ops-dispute-review',
      marker: `[visit-dispute]:${input.visitId}`,
      title: 'Visit dispute requires Med Ops review',
      description: input.disruptionNote,
      changedBy,
      ownerReference: 'Group/med-ops',
      ownerDisplay: staff.name ?? 'Medical Operations',
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit dispute logged and sent to Med Ops queue.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

