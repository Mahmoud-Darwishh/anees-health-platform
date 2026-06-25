'use server';

import { AuditAction } from '@prisma/client';
import { createVitalObservations } from '@/lib/medplum/observations';
import { createPatientAssessment } from '@/lib/medplum/assessments';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { evaluateVitalsThresholdBreaches, formatVitalsThresholdBreachSummary } from '@/lib/ehr/nursing-alerts';
import { getInstrument, scoreAssessment, type RiskSeverity } from '@/features/ehr/catalogs/assessment-instruments';
import { createAssessmentSchema, formDataToInput, recordVitalsSchema } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, createEscalationAndCommunication, hasRecentOpenVitalsAutoEscalation, assertRosteredNurseForPatientIfNurse } from './shared';

export async function recordVitalsAction(formData: FormData, opts?: { rethrow?: boolean }): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = recordVitalsSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('vitals.record', input.medplumPatientId, 'vitals');

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
      respiratoryRate: input.respiratoryRate,
      temperatureC: input.temperatureC,
      glucoseMgDl: input.glucoseMgDl,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      spo2Pct: input.spo2Pct,
      painScore: input.painScore,
    });

    const breaches = evaluateVitalsThresholdBreaches({
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      respiratoryRate: input.respiratoryRate,
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
    await failAction(formData, error, opts);
  }
}

export async function createAssessmentAction(formData: FormData, opts?: { rethrow?: boolean }): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createAssessmentSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('assessment.create', input.medplumPatientId, 'assessments');

    // Validated instrument? Enforce its range and resolve the risk band; the band
    // is stamped onto the Observation as `interpretation`.
    const instrument = getInstrument(input.assessmentInstrument ?? null);
    let bandLabel: string | null = null;
    let bandSeverity: RiskSeverity | null = null;

    if (instrument) {
      if (input.assessmentScore == null) {
        throw new Error(`${instrument.shortName} requires a score (${instrument.min}–${instrument.max}).`);
      }
      const scoring = scoreAssessment(instrument.key, input.assessmentScore);
      if (!scoring.valid) {
        throw new Error(scoring.error);
      }
      bandLabel = scoring.band?.label ?? null;
      bandSeverity = scoring.band?.severity ?? null;
    }

    const title = instrument?.label ?? input.assessmentTitle ?? 'Assessment';
    const assessmentType = instrument?.category ?? input.assessmentType;

    const assessment = await createPatientAssessment({
      patientId: input.medplumPatientId,
      title,
      assessmentType,
      score: input.assessmentScore ?? null,
      summary: input.assessmentSummary,
      notes: input.assessmentNote ?? null,
      encounterId: input.assessmentEncounterId ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
      instrumentCode: instrument?.aneesCode ?? null,
      instrumentLoinc: instrument?.loinc ?? null,
      unit: instrument?.unit ?? null,
      bandLabel,
      bandSeverity,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumAssessmentObservation',
      recordId: assessment.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'category', 'code', 'valueQuantity', 'interpretation', 'component'],
      changedBy,
      patientId: input.medplumPatientId,
      actorRole: staff.staffRole,
    });

    await setAdminPatientFlash({
      type: 'success',
      message: instrument && bandLabel ? `Assessment saved — ${instrument.shortName}: ${bandLabel}.` : 'Assessment saved successfully.',
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error, opts);
  }
}

