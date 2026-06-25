'use server';

import { AuditAction, ControlledSubstanceAction, type StaffRole } from '@prisma/client';
import { createMedicationAdministrationRecord, markMedicationAdministrationEnteredInError } from '@/lib/medplum/medication-administrations';
import { createPatientMedication, setMedicationStatus, markMedicationEnteredInError, listPatientMedications } from '@/lib/medplum/medications';
import { listPatientAllergies } from '@/lib/medplum/allergies';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { logger } from '@/lib/utils/app-logger';
import { resolveDrugTerminology, toScreenDrug } from '@/features/ehr/catalogs/drug-formulary';
import { toScreenAllergy } from '@/features/ehr/catalogs/allergen-catalog';
import { screenMedication, requiresAcknowledgement, summarizeAlerts, type ScreenDrug } from '@/lib/ehr/medication-safety';
import { createMedicationSchema, createMedicationAdministrationSchema, updateMedicationStatusSchema, retireMedicationSchema, retireMedicationAdministrationSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { canWriteMedication } from '../role-scope';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, assertRosteredNurseForPatientIfNurse } from './shared';

function isInteractionAcknowledged(formData: FormData): boolean {
  const value = formData.get('acknowledgeInteractions');
  return value === 'on' || value === 'true' || value === '1';
}

/**
 * Screen a candidate drug against the patient's active medications + allergies.
 * Returns a blocking error message when warnings/contraindications exist and the
 * clinician has not ticked the acknowledgement; otherwise returns null.
 */
async function screenCandidateOrBlock(params: {
  medplumPatientId: string;
  candidate: ScreenDrug;
  acknowledged: boolean;
}): Promise<string | null> {
  const [meds, allergyRows] = await Promise.all([
    listPatientMedications(params.medplumPatientId, 80),
    listPatientAllergies(params.medplumPatientId, 60),
  ]);

  const currentMedications = (
    await Promise.all(
      meds
        .filter((med) => med.status === 'active')
        .map((med) => toScreenDrug(med.medication, med.rxnorm)),
    )
  ).filter((drug): drug is ScreenDrug => !!drug);

  const allergies = (
    await Promise.all(allergyRows.filter((row) => !row.isNoKnownAllergy).map((row) => toScreenAllergy(row.allergen)))
  ).filter((allergy): allergy is NonNullable<typeof allergy> => !!allergy);

  const alerts = screenMedication({ candidate: params.candidate, currentMedications, allergies });

  if (requiresAcknowledgement(alerts) && !params.acknowledged) {
    return `Medication safety check found ${alerts.length} issue(s): ${summarizeAlerts(
      alerts,
    )}  •  Review, then tick "I reviewed the interaction warnings" and save again to proceed.`;
  }

  return null;
}

/**
 * Best-effort controlled-substance ledger row (EDA audit trail) for a scheduled
 * drug. Never blocks the medication save — the prescription already committed in
 * Medplum; a ledger failure is logged loudly for reconciliation.
 */
async function recordControlledSubstancePrescription(params: {
  staff: { tenantId?: string | null; staffRole?: StaffRole | null };
  medplumPatientId: string;
  drugName: string;
  schedule: string;
  rxnorm: string;
  dosage: string | null;
  route: string | null;
  changedBy: string;
}): Promise<void> {
  try {
    const localPatient = await prisma.patient.findFirst({
      where: { medplumPatientId: params.medplumPatientId, tenantId: sessionTenantId(params.staff) },
      select: { id: true, tenantId: true },
    });
    if (!localPatient) {
      logger.warn('Controlled-substance ledger skipped: local patient not found', {
        medplumPatientId: params.medplumPatientId,
      });
      return;
    }

    const ledger = await prisma.controlledSubstanceLedger.create({
      data: {
        patientId: localPatient.id,
        medicationName: params.drugName,
        dosage: params.dosage,
        route: params.route,
        actionType: ControlledSubstanceAction.prescribed,
        recordedBy: params.changedBy,
        notes: `Schedule ${params.schedule}; RxNorm ${params.rxnorm}`,
        tenantId: localPatient.tenantId,
      },
    });

    await writeMedplumAuditMirror({
      tableName: 'controlled_substance_ledger',
      recordId: ledger.id,
      action: AuditAction.create,
      changedFields: ['medicationName', 'actionType', 'recordedBy', 'schedule'],
      changedBy: params.changedBy,
      patientId: params.medplumPatientId,
      actorRole: params.staff.staffRole ?? null,
    });
  } catch (error) {
    logger.error('Controlled-substance ledger write failed', {
      medplumPatientId: params.medplumPatientId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export async function createMedicationAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createMedicationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('medication.prescribe', input.medplumPatientId, 'medications');
    if (!canWriteMedication(staff.staffRole ?? null)) {
      throw new Error('Only doctors and admins can add medications.');
    }

    // Resolve to a coded formulary drug (RxNorm/ATC + class data). A free-text
    // fallback is allowed for drugs not yet in the formulary, but it carries no
    // coding and cannot be safety-screened — we surface that on save.
    const resolved = await resolveDrugTerminology({
      label: input.medicationName,
      explicitRxnorm: input.medicationRxnorm ?? null,
    });

    // Drug–allergy / drug–drug / duplicate screening (coded drugs only).
    if (resolved) {
      const block = await screenCandidateOrBlock({
        medplumPatientId: input.medplumPatientId,
        candidate: {
          label: resolved.canonicalLabel,
          rxnorm: resolved.rxnorm,
          ingredients: resolved.ingredients,
          classes: resolved.classes,
        },
        acknowledged: isInteractionAcknowledged(formData),
      });
      if (block) {
        throw new Error(block);
      }
    }

    // Duration drives the end date: end = start + N days. If a duration is chosen
    // without an explicit start, anchor the start to today so the end is meaningful.
    const durationDays = input.medicationDurationDays ?? null;
    const startDate = input.startDate ?? (durationDays ? new Date() : null);
    const endDate =
      durationDays && startDate ? new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000) : null;

    const canonicalName = resolved?.canonicalLabel ?? input.medicationName;

    const medication = await createPatientMedication({
      patientId: input.medplumPatientId,
      medication: canonicalName,
      codings: resolved?.codings ?? null,
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
      patientId: input.medplumPatientId,
      actorRole: staff.staffRole,
    });

    // Controlled substance? Mirror a Postgres ledger row (EDA audit trail).
    if (resolved?.schedule) {
      await recordControlledSubstancePrescription({
        staff,
        medplumPatientId: input.medplumPatientId,
        drugName: canonicalName,
        schedule: resolved.schedule,
        rxnorm: resolved.rxnorm,
        dosage: input.dosageText ?? null,
        route: input.routeText ?? null,
        changedBy,
      });
    }

    await setAdminPatientFlash({
      type: 'success',
      message: resolved
        ? `Medication added (RxNorm ${resolved.rxnorm}).${resolved.schedule ? ` Controlled (${resolved.schedule}) — ledger updated.` : ''}`
        : 'Medication added (free text — not in formulary, so no interaction screening was possible).',
    });
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

export async function createMedicationAdministrationAction(formData: FormData, opts?: { rethrow?: boolean }): Promise<void> {
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
    await failAction(formData, error, opts);
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

