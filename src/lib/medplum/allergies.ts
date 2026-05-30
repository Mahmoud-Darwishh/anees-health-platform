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
  reaction?: string;
  severity?: string;
  status: string;
  onset?: string;
  note?: string;
};

export type CreateAllergyInput = {
  patientId: string;
  allergen: string;
  reaction?: string | null;
  severity?: 'mild' | 'moderate' | 'severe' | null;
  onsetDate?: Date | null;
  note?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

function normalizeAllergy(resource: AllergyIntoleranceResource): AllergySummary | null {
  if (!resource.id) return null;

  return {
    id: resource.id,
    allergen: resource.code?.text ?? resource.code?.coding?.[0]?.display ?? resource.code?.coding?.[0]?.code ?? 'Allergy',
    reaction: resource.reaction?.[0]?.manifestation?.[0]?.text ?? resource.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
    severity: resource.reaction?.[0]?.severity,
    status: resource.clinicalStatus?.coding?.[0]?.display ?? resource.clinicalStatus?.coding?.[0]?.code ?? 'unknown',
    onset: resource.onsetDateTime,
    note: resource.note?.[0]?.text,
  };
}

export async function listPatientAllergies(patientId: string, count = 50): Promise<AllergySummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('AllergyIntolerance', {
    patient: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as AllergyIntoleranceResource[];

  return resources.map(normalizeAllergy).filter((item): item is AllergySummary => !!item);
}

export async function createPatientAllergy(input: CreateAllergyInput): Promise<AllergyIntoleranceResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'AllergyIntolerance',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: 'Confirmed' }],
    },
    type: 'allergy',
    category: ['medication'],
    criticality: input.severity === 'severe' ? 'high' : 'low',
    code: {
      text: input.allergen,
    },
    patient: { reference: `Patient/${input.patientId}` },
    onsetDateTime: input.onsetDate?.toISOString(),
    recorder: input.recordedByReference
      ? { reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }
      : undefined,
    reaction: [
      {
        manifestation: input.reaction ? [{ text: input.reaction }] : undefined,
        severity: input.severity ?? undefined,
        note: input.note ? [{ text: input.note }] : undefined,
      },
    ],
    note: input.note ? [{ text: input.note }] : undefined,
  } as never)) as AllergyIntoleranceResource;
}