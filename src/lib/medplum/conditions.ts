import 'server-only';

import { getMedplumClient } from './client';
import {
  MEDPLUM_CODE_SYSTEMS,
  isRestrictedTierClinicalCoding,
  isRestrictedTierSecurityCoding,
} from './constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

export type ConditionResource = {
  resourceType: 'Condition';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    security?: FhirCoding[];
  };
  clinicalStatus?: { coding?: FhirCoding[] };
  verificationStatus?: { coding?: FhirCoding[] };
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  note?: Array<{ text?: string }>;
};

export type ConditionSummary = {
  id: string;
  label: string;
  code?: string;
  status: string;
  verification?: string;
  onset?: string;
  recordedDate?: string;
  note?: string;
  restrictedTier: boolean;
};

export type CreateConditionInput = {
  patientId: string;
  category?: 'medical' | 'physical_therapy';
  label: string;
  code?: string | null;
  onsetDate?: Date | null;
  note?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

function normalizeCondition(resource: ConditionResource): ConditionSummary | null {
  if (!resource.id) return null;

  const securityCoding = resource.meta?.security ?? [];
  const categoryCoding = resource.category?.flatMap((item) => item.coding ?? []) ?? [];
  const codeCoding = resource.code?.coding ?? [];
  const restrictedTier = [
    ...securityCoding.map((coding) => isRestrictedTierSecurityCoding(coding)),
    ...categoryCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
    ...codeCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
  ].some(Boolean);

  return {
    id: resource.id,
    label: resource.code?.text ?? resource.code?.coding?.[0]?.display ?? resource.code?.coding?.[0]?.code ?? 'Problem',
    code: resource.code?.coding?.[0]?.code,
    status: resource.clinicalStatus?.coding?.[0]?.display ?? resource.clinicalStatus?.coding?.[0]?.code ?? 'unknown',
    verification: resource.verificationStatus?.coding?.[0]?.display ?? resource.verificationStatus?.coding?.[0]?.code,
    onset: resource.onsetDateTime,
    recordedDate: resource.recordedDate,
    note: resource.note?.[0]?.text,
    restrictedTier,
  };
}

export async function listPatientConditions(patientId: string, count = 50): Promise<ConditionSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('Condition', {
    patient: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as ConditionResource[];

  return resources.map(normalizeCondition).filter((item): item is ConditionSummary => !!item);
}

export async function createPatientCondition(input: CreateConditionInput): Promise<ConditionResource> {
  const medplum = await getMedplumClient();
  const category = input.category ?? 'medical';

  const categoryCoding: FhirCoding =
    category === 'physical_therapy'
      ? {
          system: MEDPLUM_CODE_SYSTEMS.reportType,
          code: 'physical-therapy',
          display: 'Physical Therapy',
        }
      : {
          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
          code: 'problem-list-item',
          display: 'Problem List Item',
        };

  return (await medplum.createResource({
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
    },
    category: [{ coding: [categoryCoding] }],
    code: {
      coding: input.code
        ? [{ system: MEDPLUM_CODE_SYSTEMS.icd10, code: input.code, display: input.label }]
        : undefined,
      text: input.label,
    },
    subject: { reference: `Patient/${input.patientId}` },
    onsetDateTime: input.onsetDate?.toISOString(),
    recordedDate: new Date().toISOString(),
    recorder: input.recordedByReference
      ? { reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }
      : undefined,
    note: input.note ? [{ text: input.note }] : undefined,
  } as never)) as ConditionResource;
}