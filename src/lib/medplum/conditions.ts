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
  statusCode: string;
  category: 'medical' | 'physical_therapy';
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
  codings?: FhirCoding[] | null;
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

  const isPhysioTherapy = categoryCoding.some((coding) => coding.code === 'physical-therapy');
  const statusCode = resource.clinicalStatus?.coding?.[0]?.code ?? 'active';

  return {
    id: resource.id,
    label: resource.code?.text ?? resource.code?.coding?.[0]?.display ?? resource.code?.coding?.[0]?.code ?? 'Problem',
    code: resource.code?.coding?.[0]?.code,
    status: resource.clinicalStatus?.coding?.[0]?.display ?? resource.clinicalStatus?.coding?.[0]?.code ?? 'unknown',
    statusCode,
    category: isPhysioTherapy ? 'physical_therapy' : 'medical',
    verification: resource.verificationStatus?.coding?.[0]?.display ?? resource.verificationStatus?.coding?.[0]?.code,
    onset: resource.onsetDateTime,
    recordedDate: resource.recordedDate,
    note: resource.note?.[0]?.text,
    restrictedTier,
  };
}

function isEnteredInError(resource: ConditionResource): boolean {
  return (resource.verificationStatus?.coding ?? []).some((coding) => coding.code === 'entered-in-error');
}

export async function listPatientConditions(patientId: string, count = 50): Promise<ConditionSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('Condition', {
    patient: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as ConditionResource[];

  return resources
    .filter((resource) => !isEnteredInError(resource))
    .map(normalizeCondition)
    .filter((item): item is ConditionSummary => !!item);
}

export async function createPatientCondition(input: CreateConditionInput): Promise<ConditionResource> {
  const medplum = await getMedplumClient();
  const category = input.category ?? 'medical';

  const categoryCodings: FhirCoding[] = [
    {
      system: 'http://terminology.hl7.org/CodeSystem/condition-category',
      code: 'problem-list-item',
      display: 'Problem List Item',
    },
  ];

  if (category === 'physical_therapy') {
    categoryCodings.push({
      system: MEDPLUM_CODE_SYSTEMS.reportType,
      code: 'physical-therapy',
      display: 'Physical Therapy',
    });
  }

  const normalizedCodings = input.codings?.filter((coding) => Boolean(coding.system && coding.code)) ?? [];
  const fallbackIcdCoding = input.code
    ? [{ system: MEDPLUM_CODE_SYSTEMS.icd10, code: input.code, display: input.label }]
    : [];
  const resolvedCodeCodings = normalizedCodings.length > 0 ? normalizedCodings : fallbackIcdCoding;

  return (await medplum.createResource({
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
    },
    category: [{ coding: categoryCodings }],
    code: {
      coding: resolvedCodeCodings.length > 0 ? resolvedCodeCodings : undefined,
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

export async function markConditionEnteredInError(conditionId: string): Promise<ConditionResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('Condition', conditionId)) as ConditionResource;

  // FHIR con-5: clinicalStatus SHALL NOT be present when verificationStatus is
  // entered-in-error. Drop the existing clinicalStatus before persisting.
  const { clinicalStatus: _removed, ...rest } = existing;
  void _removed;

  return (await medplum.updateResource({
    ...rest,
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'entered-in-error',
          display: 'Entered in Error',
        },
      ],
    },
  } as never)) as ConditionResource;
}

export type ConditionClinicalStatus = 'active' | 'resolved' | 'inactive' | 'remission';

const CONDITION_CLINICAL_STATUS_DISPLAY: Record<ConditionClinicalStatus, string> = {
  active: 'Active',
  resolved: 'Resolved',
  inactive: 'Inactive',
  remission: 'Remission',
};

/**
 * Update a problem's clinical status (e.g. a transient finding like hyperkalaemia
 * that has since normalised → `resolved`). This is a clinical lifecycle edit and
 * is distinct from `markConditionEnteredInError`, which is reserved for records
 * that were never true. Verification stays `confirmed`.
 */
export async function setConditionClinicalStatus(
  conditionId: string,
  status: ConditionClinicalStatus,
): Promise<ConditionResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('Condition', conditionId)) as ConditionResource;

  return (await medplum.updateResource({
    ...existing,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: status,
          display: CONDITION_CLINICAL_STATUS_DISPLAY[status],
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        },
      ],
    },
  } as never)) as ConditionResource;
}