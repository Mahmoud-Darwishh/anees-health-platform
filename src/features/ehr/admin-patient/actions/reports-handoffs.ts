'use server';

import { AuditAction } from '@prisma/client';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { createPatientTask, listPatientTasks } from '@/lib/medplum/tasks';
import { createPatientCommunication } from '@/lib/medplum/communications';
import { careReportCode, careReportComponentText, createNursingReport, createNursingShiftHandoffReport, createPhysioSessionReport, listPatientCareReports } from '@/lib/medplum/care-reports';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { evaluatePatientGeoPresence } from '@/lib/geo/presence-policy';
import { createNursingReportSchema, createNursingShiftHandoffSchema, createPhysioReportSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { NURSING_HANDOFF_DEFAULT_RADIUS_METERS, NURSING_HANDOFF_MAX_ACCURACY_METERS, PHYSIO_DISCHARGE_REVIEW_MARKER, refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, getLocalPatientGeoPolicy, createPatientReviewTask, maybeCreatePhysioRedFlagEscalation, assertRosteredNurseForPatientIfNurse } from './shared';

export async function createNursingReportAction(formData: FormData): Promise<void> {
  try {
    const input = createNursingReportSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('nursing_report.create', input.medplumPatientId, 'nursing_report');
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();

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
    const input = createNursingShiftHandoffSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('nursing_shift.manage', input.medplumPatientId, 'nursing_handoff');
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();

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
      changedBy,
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
    await requireAdminPatientAction('note.physio_session.create', input.medplumPatientId, 'physio_report');

    const report = await createPhysioSessionReport({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
      sessionTemplate: input.sessionTemplate,
      sessionNumberLabel: input.sessionNumberLabel ?? '',
      subjectiveFunction: input.subjectiveFunction ?? '',
      objectiveSummary: input.objectiveSummary ?? '',
      postOpKneeFlexionDeg: input.postOpKneeFlexionDeg,
      postOpKneeExtensionDeg: input.postOpKneeExtensionDeg,
      postOpKneeEffusionGrade: input.postOpKneeEffusionGrade,
      postOpKneeGaitPhase: input.postOpKneeGaitPhase,
      strokeAshworthScore: input.strokeAshworthScore,
      strokeBergScore: input.strokeBergScore,
      strokeFunctionalReachCm: input.strokeFunctionalReachCm,
      lowBackSlrLeftDeg: input.lowBackSlrLeftDeg,
      lowBackSlrRightDeg: input.lowBackSlrRightDeg,
      lowBackSchoberCm: input.lowBackSchoberCm,
      lowBackPainWithMovement: input.lowBackPainWithMovement,
      geriatricTugSeconds: input.geriatricTugSeconds,
      geriatricTinettiScore: input.geriatricTinettiScore,
      geriatricFallRiskClass: input.geriatricFallRiskClass,
      noteBody: input.noteBody,
      interventions: input.interventions ?? '',
      painBefore: input.painBefore,
      painAfter: input.painAfter,
      responseSummary: input.responseSummary ?? '',
      homePlan: input.homePlan ?? '',
      nextSessionFocus: input.nextSessionFocus ?? '',
      dischargeReadiness: input.dischargeReadiness,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumPhysioReport',
      recordId: report.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['code', 'subject', 'encounter', 'performer', 'component', 'note'],
      changedBy,
    });

    if (input.dischargeReadiness === 'ready' || input.dischargeReadiness === 'one_to_two_sessions') {
      await createPatientReviewTask({
        medplumPatientId: input.medplumPatientId,
        taskCode: 'care-plan-review',
        marker: `${PHYSIO_DISCHARGE_REVIEW_MARKER}:${input.physioVisitId ?? report.id ?? Date.now()}`,
        title:
          input.dischargeReadiness === 'ready'
            ? 'Physio discharge summary review'
            : 'Physio discharge readiness follow-up',
        description:
          input.dischargeReadiness === 'ready'
            ? `Physiotherapist marked patient as ready for discharge. Home plan: ${input.homePlan ?? 'not provided'}`
            : `Physiotherapist estimated discharge in 1-2 sessions. Next focus: ${input.nextSessionFocus ?? 'not provided'}`,
        changedBy,
      });
    }

    await maybeCreatePhysioRedFlagEscalation({
      medplumPatientId: input.medplumPatientId,
      markerId: input.physioVisitId ?? report.id ?? Date.now().toString(),
      noteBody: input.noteBody,
      subjectiveFunction: input.subjectiveFunction,
      responseSummary: input.responseSummary,
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Physiotherapy report saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

