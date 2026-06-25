import 'server-only';

import { getMedplumClient, searchAllResources } from './client';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

export type MedicationStatementResource = {
  resourceType: 'MedicationStatement';
  id?: string;
  meta?: { versionId?: string; lastUpdated?: string };
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
  medicationCodeableConcept?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  effectivePeriod?: { start?: string; end?: string };
  dateAsserted?: string;
  informationSource?: FhirReference;
  note?: Array<{ text?: string }>;
  dosage?: Array<{
    text?: string;
    route?: { text?: string; coding?: FhirCoding[] };
    timing?: { code?: { text?: string } };
  }>;
};

export type MedicationSummary = {
  id: string;
  medication: string;
  /** RxNorm code when the medication was recorded from the coded formulary. */
  rxnorm?: string | null;
  status: MedicationStatementResource['status'];
  dosage?: string;
  route?: string;
  frequency?: string;
  start?: string;
  end?: string;
  note?: string;
};

export type CreateMedicationInput = {
  patientId: string;
  medication: string;
  /** RxNorm / ATC codings from the formulary. Empty for free-text fallback meds. */
  codings?: FhirCoding[] | null;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  status?: MedicationStatementResource['status'];
  startDate?: Date | null;
  endDate?: Date | null;
  note?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

function normalizeMedication(resource: MedicationStatementResource): MedicationSummary | null {
  if (!resource.id) return null;

  const rxnorm = resource.medicationCodeableConcept?.coding?.find((coding) =>
    (coding.system ?? '').toLowerCase().includes('rxnorm'),
  )?.code;

  return {
    id: resource.id,
    medication: resource.medicationCodeableConcept?.text ?? resource.medicationCodeableConcept?.coding?.[0]?.display ?? resource.medicationCodeableConcept?.coding?.[0]?.code ?? 'Medication',
    rxnorm: rxnorm ?? null,
    status: resource.status,
    dosage: resource.dosage?.[0]?.text,
    route: resource.dosage?.[0]?.route?.text ?? resource.dosage?.[0]?.route?.coding?.[0]?.display,
    frequency: resource.dosage?.[0]?.timing?.code?.text,
    start: resource.effectivePeriod?.start,
    end: resource.effectivePeriod?.end,
    note: resource.note?.[0]?.text,
  };
}

export async function listPatientMedications(patientId: string, count = 50): Promise<MedicationSummary[]> {
  // Paginate to completeness — the medication-safety screen relies on the full
  // active list to catch drug-drug / duplicate-therapy interactions, and
  // entered-in-error records are filtered below, so a single fixed page could
  // hide live medications. `count` is the page size.
  const resources = await searchAllResources<MedicationStatementResource>(
    'MedicationStatement',
    { subject: `Patient/${patientId}`, _sort: '-_lastUpdated' },
    { pageSize: count, maxResources: 1000 },
  );

  return resources
    .filter((resource) => resource.status !== 'entered-in-error')
    .map(normalizeMedication)
    .filter((item): item is MedicationSummary => !!item);
}

export async function createPatientMedication(input: CreateMedicationInput): Promise<MedicationStatementResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'MedicationStatement',
    status: input.status ?? 'active',
    medicationCodeableConcept: {
      coding: input.codings && input.codings.length > 0 ? input.codings : undefined,
      text: input.medication,
    },
    subject: { reference: `Patient/${input.patientId}` },
    effectivePeriod: {
      start: input.startDate?.toISOString(),
      end: input.endDate?.toISOString(),
    },
    dateAsserted: new Date().toISOString(),
    informationSource: input.recordedByReference
      ? { reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }
      : undefined,
    note: input.note ? [{ text: input.note }] : undefined,
    dosage: [
      {
        text: input.dosage ?? undefined,
        route: input.route ? { text: input.route } : undefined,
        timing: input.frequency ? { code: { text: input.frequency } } : undefined,
      },
    ],
  } as never)) as MedicationStatementResource;
}

/**
 * Medication-order lifecycle states a clinician can move an order through.
 * Distinct from `markMedicationEnteredInError`, which removes an order that was
 * never valid (data-entry mistake) rather than one that has been clinically
 * discontinued or completed.
 */
export type MedicationManageStatus = 'active' | 'on-hold' | 'completed' | 'stopped';

export async function setMedicationStatus(
  medicationId: string,
  status: MedicationManageStatus,
): Promise<MedicationStatementResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('MedicationStatement', medicationId)) as MedicationStatementResource;

  return (await medplum.updateResource({
    ...existing,
    status,
  } as never)) as MedicationStatementResource;
}

/**
 * Marks a medication order as entered-in-error (data-entry mistake). Filtered out
 * of the active list; never hard-deleted, preserving the clinical audit trail.
 */
export async function markMedicationEnteredInError(
  medicationId: string,
): Promise<MedicationStatementResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('MedicationStatement', medicationId)) as MedicationStatementResource;

  return (await medplum.updateResource({
    ...existing,
    status: 'entered-in-error',
  } as never)) as MedicationStatementResource;
}