'use server';

import { AuditAction, VisitStatus } from '@prisma/client';
import type { DisruptionCode } from '@/lib/billing/cancellation-policy';
import { ensureVisitEncounter, finishVisitEncounter } from '@/lib/medplum/encounters';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { logger } from '@/lib/utils/app-logger';
import { prisma } from '@/lib/db/prisma';
import { formDataToInput, acknowledgeVisitSchema, startTravelSchema, markArrivedSchema, checkInVisitSchema, checkOutVisitSchema, cancelVisitByPatientSchema, cancelVisitByMedOpsSchema, declineVisitSchema, reassignVisitSchema, markRefusedAtDoorSchema, markPatientNotHomeSchema, divertVisitSchema, interruptSessionSchema, rescheduleInPlaceSchema, disputeVisitSchema } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { WorkflowStateValue, refreshClinicalPaths, failAction, requireAdminPatientAction, getCoordinationWriterWithPractitioner, getWorkflowVisitOrThrow, persistWorkflowStateTransition, parseScheduledVisitDateTime, applyDisruptionFinancials, toNumber, createPatientReviewTask, maybeCreateLateCheckInTask, assertVisitHasClinicalEvidence, maybeCreateCheckoutReviewTasks, writeVisitWorkflowAudit, evaluateVisitGeofence, isClosedVisitStatus } from './shared';

// A manual ("testing") override lets an authorised staff member force a state
// transition out of sequence — e.g. to re-drive a closed visit, or check in
// without a GPS fix. Every forced transition is still recorded as an override
// in the immutable ledger + audit log, so nothing happens off the books.
const OVERRIDE_METHOD = 'manual_override';
const OVERRIDE_REASON = 'Manual override (testing/correction)';

function isManualOverride(formData: FormData): boolean {
  const value = formData.get('force');
  return value === 'on' || value === 'true' || value === '1';
}

type EncounterSyncContext = {
  patientId: string;
  visitId: string;
  practitionerReference?: string | null;
  practitionerName?: string | null;
  changedBy: string;
};

// Open the FHIR Encounter that wraps this visit when the clinician checks in.
// Best-effort: the operational check-in has already committed, so a Medplum
// outage must never fail it — the encounter is idempotent and self-heals at
// check-out. Errors are logged (message only, never PHI) for observability.
async function openVisitEncounter(ctx: EncounterSyncContext & { startAt: Date }): Promise<void> {
  try {
    const encounter = await ensureVisitEncounter({
      patientId: ctx.patientId,
      visitId: ctx.visitId,
      // Home-care platform: visits are in-home unless modelled otherwise.
      visitType: 'in_home',
      startAt: ctx.startAt,
      practitionerReference: ctx.practitionerReference,
      practitionerName: ctx.practitionerName,
    });
    await writeMedplumAuditMirror({
      tableName: 'MedplumEncounter',
      recordId: encounter.id ?? `visit:${ctx.visitId}`,
      action: AuditAction.create,
      changedFields: ['status', 'period.start', 'subject', 'participant.individual', 'identifier'],
      changedBy: ctx.changedBy,
    });
  } catch (error) {
    logger.error('Failed to open visit encounter on check-in', {
      visitId: ctx.visitId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

// Sign off (complete) the visit's FHIR Encounter at check-out. Ensures the
// encounter exists first so it self-heals if check-in could not open it.
async function completeVisitEncounter(ctx: EncounterSyncContext & { startAt: Date; endAt: Date }): Promise<void> {
  try {
    await ensureVisitEncounter({
      patientId: ctx.patientId,
      visitId: ctx.visitId,
      visitType: 'in_home',
      startAt: ctx.startAt,
      practitionerReference: ctx.practitionerReference,
      practitionerName: ctx.practitionerName,
    });
    const finished = await finishVisitEncounter({ visitId: ctx.visitId, endAt: ctx.endAt });
    if (finished) {
      await writeMedplumAuditMirror({
        tableName: 'MedplumEncounter',
        recordId: finished.id ?? `visit:${ctx.visitId}`,
        action: AuditAction.update,
        changedFields: ['status', 'period.end'],
        changedBy: ctx.changedBy,
      });
    }
  } catch (error) {
    logger.error('Failed to complete visit encounter on check-out', {
      visitId: ctx.visitId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export async function acknowledgeVisitAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = acknowledgeVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.acknowledge', input.medplumPatientId, 'visits');
    const override = isManualOverride(formData);
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!override && isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be acknowledged in its current status. Use the testing override to force it.');
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        acknowledgedAt: input.acknowledgedAt ?? new Date(),
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'acknowledged',
      changedBy,
      isOverride: override,
      overrideMethod: override ? OVERRIDE_METHOD : null,
      reasonNote: override ? OVERRIDE_REASON : null,
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
    const override = isManualOverride(formData);
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!override && !visit.acknowledgedAt) {
      throw new Error('Visit must be acknowledged before starting travel.');
    }

    if (!override && isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot start travel in its current status. Use the testing override to force it.');
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        enRouteAt: input.enRouteAt ?? new Date(),
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'en_route',
      changedBy,
      isOverride: override,
      overrideMethod: override ? OVERRIDE_METHOD : null,
      reasonNote: override ? OVERRIDE_REASON : null,
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
    const override = isManualOverride(formData);
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!override && !visit.enRouteAt) {
      throw new Error('Visit must be en-route before arrival can be marked.');
    }

    if (!override && isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be marked as arrived in its current status. Use the testing override to force it.');
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        arrivedAt: input.arrivedAt ?? new Date(),
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'arrived',
      changedBy,
      isOverride: override,
      overrideMethod: override ? OVERRIDE_METHOD : null,
      reasonNote: override ? OVERRIDE_REASON : null,
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
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = checkInVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.check_in', input.medplumPatientId, 'visits');
    const override = isManualOverride(formData);
    const checkInAt = input.checkInAt ?? new Date();
    const latitude = input.checkInLatitude;
    const longitude = input.checkInLongitude;
    const hasGeo = latitude != null && longitude != null;
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!override && !visit.arrivedAt && !visit.enRouteAt) {
      throw new Error('Visit must be in travel/arrival flow before check-in. Use the testing override to force it.');
    }

    if (!override && isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be checked in in its current status. Use the testing override to force it.');
    }

    if (!override && !hasGeo) {
      throw new Error('Live location is required to check in. Allow location access, or use the testing override.');
    }

    // Run the geofence only when we have a real fix and aren't force-overriding.
    let geofencePassed = false;
    let isOverride = override;
    let overrideReasonNote: string | null = override ? OVERRIDE_REASON : null;
    let overrideMethod: string | null = override ? OVERRIDE_METHOD : null;

    if (!override && latitude != null && longitude != null) {
      const geofenceEvaluation = await evaluateVisitGeofence({
        medplumPatientId: input.medplumPatientId,
        role: staff.staffRole,
        purpose: 'checkin',
        latitude,
        longitude,
        accuracyMeters: input.checkInAccuracyMeters,
      });

      geofencePassed = geofenceEvaluation.allowed;
      if (!geofenceEvaluation.allowed) {
        if (!input.geofenceOverrideMethod) {
          throw new Error(
            `${geofenceEvaluation.failureReason ?? 'Visit geo-presence check failed.'} Add an approved override method to continue.`,
          );
        }
        if (!input.geofenceOverrideReason || input.geofenceOverrideReason.trim().length < 6) {
          throw new Error('Override reason is required (minimum 6 characters) when geofence validation fails.');
        }
        isOverride = true;
        overrideMethod = input.geofenceOverrideMethod;
        overrideReasonNote = `${input.geofenceOverrideReason} (${geofenceEvaluation.failureReason ?? 'geo override'})`;
      }
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        status: VisitStatus.in_progress,
        checkInAt,
        checkInLat: latitude,
        checkInLng: longitude,
        checkInAccuracyM: input.checkInAccuracyMeters,
        geofencePassed,
        geofenceOverrideMethod: isOverride ? overrideMethod : null,
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
      checkedInAt: checkInAt,
      hadEnRoute: Boolean(visit.enRouteAt),
      changedBy,
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'checked_in',
      changedBy,
      reasonNote: overrideReasonNote,
      latitude,
      longitude,
      accuracyMeters: input.checkInAccuracyMeters,
      isOverride,
      overrideMethod: isOverride ? overrideMethod : null,
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

    // Open the clinical Encounter wrapper for this visit (docs §7: check-in
    // "starts encounter"). Best-effort — never blocks the operational check-in.
    await openVisitEncounter({
      patientId: input.medplumPatientId,
      visitId: visit.id,
      startAt: checkInAt,
      practitionerReference: practitioner.reference,
      practitionerName: staff.name ?? staff.email,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Visit checked in.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function checkOutVisitAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = checkOutVisitSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('visit.check_out', input.medplumPatientId, 'visits');
    const override = isManualOverride(formData);
    const checkOutAt = input.checkOutAt ?? new Date();
    const latitude = input.checkOutLatitude;
    const longitude = input.checkOutLongitude;
    const hasGeo = latitude != null && longitude != null;
    const visit = await getWorkflowVisitOrThrow({
      visitId: input.visitId,
      medplumPatientId: input.medplumPatientId,
    });

    if (!override && !visit.checkInAt) {
      throw new Error('Visit must be checked in before check-out. Use the testing override to force it.');
    }

    if (!override && isClosedVisitStatus(visit.status)) {
      throw new Error('Visit cannot be checked out in its current status. Use the testing override to force it.');
    }

    if (!override && !hasGeo) {
      throw new Error('Live location is required to check out. Allow location access, or use the testing override.');
    }

    if (!override && latitude != null && longitude != null) {
      const geofenceEvaluation = await evaluateVisitGeofence({
        medplumPatientId: input.medplumPatientId,
        role: staff.staffRole,
        purpose: 'checkout',
        latitude,
        longitude,
        accuracyMeters: input.checkOutAccuracyMeters,
      });

      if (!geofenceEvaluation.allowed) {
        throw new Error(geofenceEvaluation.failureReason ?? 'Visit geo-presence check failed.');
      }
    }

    if (!override) {
      await assertVisitHasClinicalEvidence({
        medplumPatientId: input.medplumPatientId,
        startedAt: visit.checkInAt ?? checkOutAt,
        endedAt: checkOutAt,
      });
    }

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        status: VisitStatus.completed,
        checkOutAt,
        checkOutLat: latitude,
        checkOutLng: longitude,
      },
    });

    await persistWorkflowStateTransition({
      visit,
      toState: 'checked_out',
      changedBy,
      latitude,
      longitude,
      accuracyMeters: input.checkOutAccuracyMeters,
      isOverride: override,
      overrideMethod: override ? OVERRIDE_METHOD : null,
      reasonNote: override ? OVERRIDE_REASON : null,
    });

    await maybeCreateCheckoutReviewTasks({
      medplumPatientId: input.medplumPatientId,
      visitId: visit.id,
      checkInAt: visit.checkInAt ?? checkOutAt,
      checkOutAt,
      checkInLat: toNumber(visit.checkInLat),
      checkInLng: toNumber(visit.checkInLng),
      checkOutLat: latitude ?? 0,
      checkOutLng: longitude ?? 0,
      changedBy,
    });

    await writeVisitWorkflowAudit({
      visitId: visit.id,
      changedBy,
      changedFields: ['status', 'state', 'checkOutAt', 'checkOutLat', 'checkOutLng'],
    });

    // Complete (sign off) the clinical Encounter for this visit (docs §7:
    // check-out "encounter signed"). Self-heals if check-in could not open it.
    await completeVisitEncounter({
      patientId: input.medplumPatientId,
      visitId: visit.id,
      startAt: visit.checkInAt ?? checkOutAt,
      endAt: checkOutAt,
      practitionerReference: practitioner.reference,
      practitionerName: staff.name ?? staff.email,
      changedBy,
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

