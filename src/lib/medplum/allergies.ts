import 'server-only';

import { getMedplumClient } from './client';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

export type AllergyIntoleranceResource = {
  resourceType: 'AllergyIntolerance';
  id?: string;
  meta?: { versionId?: string; lastUpdated?: string };
  clinicalStatus?: { coding?: FhirCoding[] };
  verificationStatus?: { coding?: FhirCoding[] };
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code?: { coding?: FhirCoding[]; text?: string };
  patient?: FhirReference;
  onsetDateTime?: string;
  recorder?: FhirReference;
  reaction?: Array<{
    manifestation?: Array<{ coding?: FhirCoding[]; text?: string }>;
    severity?: 'mild' | 'moderate' | 'severe';
    note?: Array<{ text?: string }>;
  }>;
  note?: Array<{ text?: string }>;
};

export type AllergySummary = {
  id: string;
  allergen: string;
  severity?: string;
  reaction?: string;
  onset?: string;
  status: string;
  statusCode: string;
  note?: string;
};

export type CreateAllergyInput = {
  patientId: string;
  allergen: string;
  severity?: 'mild' | 'moderate' | 'severe' | null;
  note?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

function normalizeAllergy(resource: AllergyIntoleranceResource): AllergySummary | null {
  if (!resource.id) return null;

  return {
    id: resource.id,
    allergen: resource.code?.text ?? resource.code?.coding?.[0]?.display ?? resource.code?.coding?.[0]?.code ?? 'Allergy',
    severity: resource.reaction?.[0]?.severity,
    reaction:
      resource.reaction?.[0]?.manifestation?.[0]?.text ??
      resource.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
    onset: resource.onsetDateTime,
    status: resource.clinicalStatus?.coding?.[0]?.display ?? resource.clinicalStatus?.coding?.[0]?.code ?? 'unknown',
    statusCode: resource.clinicalStatus?.coding?.[0]?.code ?? 'active',
    note: resource.note?.[0]?.text,
  };
}

function isEnteredInError(resource: AllergyIntoleranceResource): boolean {
  return (resource.verificationStatus?.coding ?? []).some((coding) => coding.code === 'entered-in-error');
}

export async function listPatientAllergies(patientId: string, count = 50): Promise<AllergySummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('AllergyIntolerance', {
    patient: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as AllergyIntoleranceResource[];

  return resources
    .filter((resource) => !isEnteredInError(resource))
    .map(normalizeAllergy)
    .filter((item): item is AllergySummary => !!item);
}

export async function createPatientAllergy(input: CreateAllergyInput): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();

  const noteText = input.note?.trim() || null;
  const severity = input.severity ?? null;

  // FHIR ait constraint: a `reaction` entry MUST carry a `manifestation`. We only
  // capture severity now (no reaction text), so build a reaction with a neutral
  // manifestation when a severity is given, and omit `reaction` entirely otherwise.
  const reaction = severity
    ? [
        {
          manifestation: [{ text: 'Unspecified reaction' }],
          severity,
        },
      ]
    : undefined;

  return (await medplum.createResource({
    resourceType: 'AllergyIntolerance',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'unconfirmed', display: 'Unconfirmed' }],
    },
    criticality: severity === 'severe' ? 'high' : severity ? 'low' : 'unable-to-assess',
    code: {
      text: input.allergen,
    },
    patient: { reference: `Patient/${input.patientId}` },
    recorder: input.recordedByReference
      ? { reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }
      : undefined,
    reaction,
    note: noteText ? [{ text: noteText }] : undefined,
  } as never)) as AllergyIntoleranceResource;
}

export async function markAllergyEnteredInError(allergyId: string): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('AllergyIntolerance', allergyId)) as AllergyIntoleranceResource;

  // FHIR ait-2: clinicalStatus SHALL NOT be present when verificationStatus is
  // entered-in-error. Drop the existing clinicalStatus before persisting.
  const { clinicalStatus: _removed, ...rest } = existing;
  void _removed;

  return (await medplum.updateResource({
    ...rest,
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
          code: 'entered-in-error',
          display: 'Entered in Error',
        },
      ],
    },
  } as never)) as AllergyIntoleranceResource;
}

export type AllergyClinicalStatus = 'active' | 'inactive' | 'resolved';

const ALLERGY_CLINICAL_STATUS_DISPLAY: Record<AllergyClinicalStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  resolved: 'Resolved',
};

/**
 * Update an allergy's clinical status (e.g. mark it inactive/resolved once it is
 * no longer relevant). Distinct from `markAllergyEnteredInError`, which is for
 * records that were entered by mistake. Verification stays `confirmed`.
 */
export async function setAllergyClinicalStatus(
  allergyId: string,
  status: AllergyClinicalStatus,
): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('AllergyIntolerance', allergyId)) as AllergyIntoleranceResource;

  return (await medplum.updateResource({
    ...existing,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: status,
          display: ALLERGY_CLINICAL_STATUS_DISPLAY[status],
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
          code: 'confirmed',
          display: 'Confirmed',
        },
      ],
    },
  } as never)) as AllergyIntoleranceResource;
}