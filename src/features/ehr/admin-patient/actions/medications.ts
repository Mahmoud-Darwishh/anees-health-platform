'use server';

import { AuditAction } from '@prisma/client';
import { createMedicationAdministrationRecord, markMedicationAdministrationEnteredInError } from '@/lib/medplum/medication-administrations';
import { createPatientMedication, setMedicationStatus, markMedicationEnteredInError } from '@/lib/medplum/medications';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { createMedicationSchema, createMedicationAdministrationSchema, updateMedicationStatusSchema, retireMedicationSchema, retireMedicationAdministrationSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { canWriteMedication } from '../role-scope';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, assertRosteredNurseForPatientIfNurse } from './shared';

export async function createMedicationAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createMedicationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('medication.prescribe', input.medplumPatientId, 'medications');
    if (!canWriteMedication(staff.staffRole ?? null)) {
      throw new Error('Only doctors and admins can add medications.');
    }

    // Duration drives the end date: end = start + N days. If a duration is chosen
    // without an explicit start, anchor the start to today so the end is meaningful.
    const durationDays = input.medicationDurationDays ?? null;
    const startDate = input.startDate ?? (durationDays ? new Date() : null);
    const endDate =
      durationDays && startDate ? new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000) : null;

    const medication = await createPatientMedication({
      patientId: input.medplumPatientId,
      medication: input.medicationName,
      dosage: input.dosageText ?? null,
      route: input.routeText ?? null,
      frequency: input.frequencyText ?? null,
      status: 'active',
      startDate,
      endDate,
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

export async function updateMedicationStatusAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getClinicalWriterWithPractitioner();
    const input = updateMedicationStatusSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('medication.reconcile', input.medplumPatientId, 'medications');
    if (!canWriteMedication(staff.staffRole ?? null)) {
      throw new Error('Only doctors and admins can manage medications.');
    }

    const medication = await setMedicationStatus(input.medicationId, input.medicationManageStatus);

    await writeMedplumAuditMirror({
      tableName: 'MedplumMedicationStatement',
      recordId: medication.id ?? input.medicationId,
      action: AuditAction.update,
      changedFields: ['status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: `Medication marked as ${input.medicationManageStatus}.` });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function retireMedicationAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getClinicalWriterWithPractitioner();
    const input = retireMedicationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('medication.reconcile', input.medplumPatientId, 'medications');
    if (!canWriteMedication(staff.staffRole ?? null)) {
      throw new Error('Only doctors and admins can manage medications.');
    }

    const medication = await markMedicationEnteredInError(input.medicationId);

    await writeMedplumAuditMirror({
      tableName: 'MedplumMedicationStatement',
      recordId: medication.id ?? input.medicationId,
      action: AuditAction.update,
      changedFields: ['status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Medication deleted (marked entered-in-error).' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createMedicationAdministrationAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createMedicationAdministrationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('medication.administer', input.medplumPatientId, 'medication_administration');

    // The MAR checklist records "now"; only the ad-hoc form may supply a specific time.
    const administeredAt = input.administeredAt ?? new Date();

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, administeredAt);

    const administration = await createMedicationAdministrationRecord({
      patientId: input.medplumPatientId,
      medicationStatementId: input.medicationStatementId ?? null,
      medicationName: input.medicationName,
      encounterId: input.encounterId ?? null,
      scheduledAt: input.scheduledAt ?? null,
      administeredAt,
      administrationStatus: input.administrationStatus,
      reason: input.administrationReason ?? null,
      note: input.administrationNote ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumMedicationAdministration',
      recordId: administration.id,
      action: AuditAction.create,
      changedFields: ['status', 'category', 'medicationCodeableConcept', 'subject', 'performer', 'reasonCode', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Medication administration saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function retireMedicationAdministrationAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = retireMedicationAdministrationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('medication.administer', input.medplumPatientId, 'medication_administration');

    const administration = await markMedicationAdministrationEnteredInError(input.administrationId);

    await writeMedplumAuditMirror({
      tableName: 'MedplumMedicationAdministration',
      recordId: administration.id ?? input.administrationId,
      action: AuditAction.update,
      changedFields: ['status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'MAR entry deleted (marked entered-in-error).' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

