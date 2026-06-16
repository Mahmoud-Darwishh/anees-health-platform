'use server';

import { AuditAction } from '@prisma/client';
import { createGlucoseReading } from '@/lib/medplum/glucose';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { toCanonicalMgDl } from '@/lib/clinical/glucose-units';
import {
  classifyGlucose,
  glucoseCategoryLabel,
  isHypoglycemia,
} from '@/lib/clinical/glucose-profile';
import { recordGlucoseSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import {
  refreshClinicalPaths,
  failAction,
  requireAdminPatientAction,
  getClinicalWriterWithPractitioner,
  createEscalationAndCommunication,
  hasRecentOpenVitalsAutoEscalation,
  assertRosteredNurseForPatientIfNurse,
} from './shared';

export async function recordGlucoseReadingAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = recordGlucoseSchema.parse(formDataToInput(formData));
    // Glucose is a vital sign — reuse the licensed, case-scoped vitals gate.
    await requireAdminPatientAction('vitals.record', input.medplumPatientId, 'glucose');

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, input.recordedAt);

    // Convert to canonical mg/dL at the boundary; nothing downstream sees mmol/L.
    const valueMgDl = toCanonicalMgDl(input.glucoseValue, input.glucoseUnit);
    const category = classifyGlucose(valueMgDl, input.glucoseTiming);

    const reading = await createGlucoseReading({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
      recordedAt: input.recordedAt,
      valueMgDl,
      timing: input.glucoseTiming,
      meal: input.glucoseMeal,
      symptomatic: input.glucoseSymptomatic,
      treatmentGiven: input.glucoseTreatment ?? null,
      note: input.glucoseNote ?? null,
    });

    // Context-aware alerting: a hypo (any low) or a critical high escalates. The
    // threshold is timing-specific, so a "high" fasting reading and an in-range
    // post-meal reading at the same number are treated differently.
    const alertable = isHypoglycemia(category) || category === 'critical_high';
    if (alertable) {
      const hasRecentAutoEscalation = await hasRecentOpenVitalsAutoEscalation(input.medplumPatientId);
      if (!hasRecentAutoEscalation) {
        await createEscalationAndCommunication({
          patientId: input.medplumPatientId,
          encounterId: input.encounterId ?? null,
          title: 'Blood glucose alert',
          summary: `Automatic escalation from glucose reading: ${valueMgDl} mg/dL (${glucoseCategoryLabel(
            category,
          )}, ${input.glucoseTiming.replace('_', ' ')}).`,
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
      recordId: reading.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: [
        'effectiveDateTime',
        'encounter',
        'performer',
        'glucoseMgDl',
        'glucoseTiming',
        'glucoseMeal',
        'interpretation',
      ],
      changedBy,
    });

    const alertMessage = alertable
      ? ` ${glucoseCategoryLabel(category)} reading — escalation raised.`
      : '';
    await setAdminPatientFlash({
      type: 'success',
      message: `Glucose reading saved (${valueMgDl} mg/dL, ${glucoseCategoryLabel(category)}).${alertMessage}`,
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}
