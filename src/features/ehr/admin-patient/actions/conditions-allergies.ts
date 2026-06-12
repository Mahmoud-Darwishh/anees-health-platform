'use server';

import { AuditAction } from '@prisma/client';
import { createPatientCondition, markConditionEnteredInError, setConditionClinicalStatus } from '@/lib/medplum/conditions';
import { createPatientAllergy, markAllergyEnteredInError, setAllergyClinicalStatus } from '@/lib/medplum/allergies';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { resolveProblemTerminology } from '@/features/ehr/catalogs/icd10-problems';
import { createConditionSchema, createAllergySchema, retireConditionSchema, retireAllergySchema, updateConditionStatusSchema, updateAllergyStatusSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { canWriteClinicalCondition } from '../role-scope';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner } from './shared';

export async function createConditionAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createConditionSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction(
      input.conditionCategory === 'physical_therapy' ? 'condition.pt.create' : 'condition.medical.create',
      input.medplumPatientId,
      'conditions',
    );

    if (!canWriteClinicalCondition(staff.staffRole ?? null, input.conditionCategory)) {
      if (input.conditionCategory === 'physical_therapy') {
        throw new Error('PT diagnoses can be authored by physiotherapists, admins, or superadmins only.');
      }
      throw new Error('Medical diagnoses can be authored by doctors, admins, or superadmins only.');
    }

    // Coded-only: a problem MUST resolve to a valid ICD-10 code from the app-owned
    // catalog. Free-text problems are rejected — this keeps the problem list
    // analysable and error-free.
    const terminology = await resolveProblemTerminology({
      label: input.conditionLabel,
      explicitIcd10: input.conditionCode ?? null,
    });

    if (!terminology) {
      throw new Error(
        'Select a coded problem from the ICD-10 suggestions. Free-text problems are not allowed.',
      );
    }

    const canonicalLabel = terminology.canonicalLabel;
    const resolvedIcd10 = terminology.icd10;
    const resolvedCodings = terminology.codings;

    const condition = await createPatientCondition({
      patientId: input.medplumPatientId,
      category: input.conditionCategory,
      label: canonicalLabel,
      code: resolvedIcd10,
      codings: resolvedCodings,
      onsetDate: input.conditionOnsetDate ?? null,
      note: input.conditionNote ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCondition',
      recordId: condition.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['clinicalStatus', 'verificationStatus', 'code', 'subject', 'onsetDateTime', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({
      type: 'success',
      message: `Problem added (ICD-10 ${resolvedIcd10}).`,
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createAllergyAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createAllergySchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('allergy.create', input.medplumPatientId, 'allergies');

    // Allergies are free text by design — a short typed allergen is enough
    // for point-of-care safety; no coded terminology lookup is required here.
    const allergy = await createPatientAllergy({
      patientId: input.medplumPatientId,
      allergen: input.allergen,
      severity: input.allergySeverity ?? null,
      note: input.allergyNote ?? null,
      recordedByReference: practitioner.reference,
      recordedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumAllergyIntolerance',
      recordId: allergy.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['clinicalStatus', 'verificationStatus', 'code', 'note'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Allergy added successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function retireConditionAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = retireConditionSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('condition.retire', input.medplumPatientId, 'conditions');

    const condition = await markConditionEnteredInError(input.conditionId);

    await writeMedplumAuditMirror({
      tableName: 'MedplumCondition',
      recordId: condition.id ?? input.conditionId,
      action: AuditAction.update,
      changedFields: ['verificationStatus', 'clinicalStatus'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Problem deleted (marked entered-in-error).' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function retireAllergyAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = retireAllergySchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('allergy.retire', input.medplumPatientId, 'allergies');

    const allergy = await markAllergyEnteredInError(input.allergyId);

    await writeMedplumAuditMirror({
      tableName: 'MedplumAllergyIntolerance',
      recordId: allergy.id ?? input.allergyId,
      action: AuditAction.update,
      changedFields: ['verificationStatus', 'clinicalStatus'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Allergy deleted (marked entered-in-error).' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updateConditionStatusAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = updateConditionStatusSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('condition.retire', input.medplumPatientId, 'conditions');

    const condition = await setConditionClinicalStatus(input.conditionId, input.conditionStatus);

    await writeMedplumAuditMirror({
      tableName: 'MedplumCondition',
      recordId: condition.id ?? input.conditionId,
      action: AuditAction.update,
      changedFields: ['clinicalStatus'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: `Problem marked as ${input.conditionStatus}.` });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updateAllergyStatusAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = updateAllergyStatusSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('allergy.retire', input.medplumPatientId, 'allergies');

    const allergy = await setAllergyClinicalStatus(input.allergyId, input.allergyStatus);

    await writeMedplumAuditMirror({
      tableName: 'MedplumAllergyIntolerance',
      recordId: allergy.id ?? input.allergyId,
      action: AuditAction.update,
      changedFields: ['clinicalStatus'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: `Allergy marked as ${input.allergyStatus}.` });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

