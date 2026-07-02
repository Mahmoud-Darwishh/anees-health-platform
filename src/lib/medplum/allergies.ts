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

export type AllergyCategory = 'food' | 'medication' | 'environment' | 'biologic';

/** SNOMED "No known allergy" — the affirmative NKA record. */
const NO_KNOWN_ALLERGY_CODE = '716186003';

export type AllergySummary = {
  id: string;
  allergen: string;
  category?: AllergyCategory;
  severity?: string;
  reaction?: string;
  onset?: string;
  status: string;
  statusCode: string;
  note?: string;
  /** True for the affirmative "No Known Allergies" record. */
  isNoKnownAllergy?: boolean;
  /** FHIR version at read time — round-tripped as an optimistic-lock guard. */
  versionId?: string | null;
};

export type CreateAllergyInput = {
  patientId: string;
  allergen: string;
  category?: AllergyCategory | null;
  /** SNOMED / Anees codings from the allergen catalog. Empty for free-text. */
  codings?: FhirCoding[] | null;
  reactionManifestation?: string | null;
  severity?: 'mild' | 'moderate' | 'severe' | null;
  note?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

function normalizeAllergy(resource: AllergyIntoleranceResource): AllergySummary | null {
  if (!resource.id) return null;

  const isNoKnownAllergy = (resource.code?.coding ?? []).some((coding) => coding.code === NO_KNOWN_ALLERGY_CODE);

  return {
    id: resource.id,
    allergen: resource.code?.text ?? resource.code?.coding?.[0]?.display ?? resource.code?.coding?.[0]?.code ?? 'Allergy',
    category: resource.category?.[0],
    severity: resource.reaction?.[0]?.severity,
    reaction:
      resource.reaction?.[0]?.manifestation?.[0]?.text ??
      resource.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
    onset: resource.onsetDateTime,
    status: resource.clinicalStatus?.coding?.[0]?.display ?? resource.clinicalStatus?.coding?.[0]?.code ?? 'unknown',
    statusCode: resource.clinicalStatus?.coding?.[0]?.code ?? 'active',
    note: resource.note?.[0]?.text,
    isNoKnownAllergy,
    versionId: resource.meta?.versionId ?? null,
  };
}

function isEnteredInError(resource: AllergyIntoleranceResource): boolean {
  return (resource.verificationStatus?.coding ?? []).some((coding) => coding.code === 'entered-in-error');
}

export async function listPatientAllergies(patientId: string, count = 50): Promise<AllergySummary[]> {
  // Paginate to completeness — a truncated allergy list is a safety hazard, and
  // entered-in-error records are filtered below (after the fetch), so a fixed
  // single page could hide active allergies behind corrected ones. `count` is the
  // page size; the full list is returned up to a generous safety cap.
  const resources = await searchAllResources<AllergyIntoleranceResource>(
    'AllergyIntolerance',
    { patient: `Patient/${patientId}`, _sort: '-_lastUpdated' },
    { pageSize: count, maxResources: 1000 },
  );

  return resources
    .filter((resource) => !isEnteredInError(resource))
    .map(normalizeAllergy)
    .filter((item): item is AllergySummary => !!item);
}

export async function createPatientAllergy(input: CreateAllergyInput): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();

  const noteText = input.note?.trim() || null;
  const severity = input.severity ?? null;
  const manifestationText = input.reactionManifestation?.trim() || null;

  // FHIR ait constraint: a `reaction` entry MUST carry a `manifestation`. Build a
  // reaction when we have either a severity or a recorded manifestation; otherwise
  // omit `reaction` entirely.
  const reaction =
    severity || manifestationText
      ? [
          {
            manifestation: [{ text: manifestationText ?? 'Unspecified reaction' }],
            ...(severity ? { severity } : {}),
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
    category: input.category ? [input.category] : undefined,
    criticality: severity === 'severe' ? 'high' : severity ? 'low' : 'unable-to-assess',
    code: {
      coding: input.codings && input.codings.length > 0 ? input.codings : undefined,
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

/**
 * Records the affirmative "No Known Allergies" status as a SNOMED-coded
 * AllergyIntolerance (716186003) with `verificationStatus = confirmed`. This is
 * clinically distinct from an empty allergy list (which means "not asked").
 */
export async function createNoKnownAllergyRecord(input: {
  patientId: string;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
}): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'AllergyIntolerance',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: 'Confirmed' }],
    },
    code: {
      coding: [{ system: 'http://snomed.info/sct', code: NO_KNOWN_ALLERGY_CODE, display: 'No known allergy' }],
      text: 'No known allergies',
    },
    patient: { reference: `Patient/${input.patientId}` },
    recorder: input.recordedByReference
      ? { reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }
      : undefined,
  } as never)) as AllergyIntoleranceResource;
}

export async function markAllergyEnteredInError(
  allergyId: string,
  options?: { expectedVersionId?: string | null },
): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('AllergyIntolerance', allergyId)) as AllergyIntoleranceResource;

  if (options?.expectedVersionId && existing.meta?.versionId !== options.expectedVersionId) {
    throw new Error('This allergy was updated by another user. Please refresh and try again.');
  }

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
  } as never, {
    headers: options?.expectedVersionId
      ? { 'If-Match': `W/\"${options.expectedVersionId}\"` }
      : undefined,
  })) as AllergyIntoleranceResource;
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
  options?: { expectedVersionId?: string | null },
): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('AllergyIntolerance', allergyId)) as AllergyIntoleranceResource;

  if (options?.expectedVersionId && existing.meta?.versionId !== options.expectedVersionId) {
    throw new Error('This allergy was updated by another user. Please refresh and try again.');
  }

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
  } as never, {
    headers: options?.expectedVersionId
      ? { 'If-Match': `W/\"${options.expectedVersionId}\"` }
      : undefined,
  })) as AllergyIntoleranceResource;
}