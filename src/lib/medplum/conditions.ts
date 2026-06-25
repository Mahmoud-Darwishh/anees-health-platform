import 'server-only';

import { getMedplumClient, searchAllResources } from './client';
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
  severity?: { coding?: FhirCoding[]; text?: string };
  bodySite?: Array<{ coding?: FhirCoding[]; text?: string }>;
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
  severity?: string;
  bodySite?: string;
  onset?: string;
  recordedDate?: string;
  note?: string;
  restrictedTier: boolean;
};

export type ConditionVerification = 'confirmed' | 'provisional' | 'differential' | 'unconfirmed';

export type CreateConditionInput = {
  patientId: string;
  category?: 'medical' | 'physical_therapy';
  label: string;
  code?: string | null;
  codings?: FhirCoding[] | null;
  verificationStatus?: ConditionVerification | null;
  severity?: 'mild' | 'moderate' | 'severe' | null;
  bodySite?: string | null;
  onsetDate?: Date | null;
  note?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

const CONDITION_VER_STATUS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/condition-ver-status';
const RESTRICTED_TIER_SYSTEM = 'https://anees.health/fhir/CodeSystem/restricted-tier';

const VERIFICATION_DISPLAY: Record<ConditionVerification, string> = {
  confirmed: 'Confirmed',
  provisional: 'Provisional',
  differential: 'Differential',
  unconfirmed: 'Unconfirmed',
};

const SEVERITY_SNOMED: Record<'mild' | 'moderate' | 'severe', { code: string; display: string }> = {
  mild: { code: '255604002', display: 'Mild' },
  moderate: { code: '6736007', display: 'Moderate' },
  severe: { code: '24484000', display: 'Severe' },
};

/**
 * Auto-classify a sensitive diagnosis into a restricted security tier (so the
 * existing restricted-tier masking in the chart applies automatically). Driven by
 * ICD-10 ranges + label hints: mental/behavioural (F-codes) → `psy`; HIV
 * (B20–B24, Z21) and STIs (A50–A64) → `r`.
 */
function restrictedTierForCondition(code: string | null | undefined, label: string | null | undefined): FhirCoding | null {
  const c = (code ?? '').toUpperCase();
  if (/^F\d/.test(c)) return { system: RESTRICTED_TIER_SYSTEM, code: 'psy', display: 'Behavioral health' };
  if (/^B2[0-4]/.test(c) || /^Z21/.test(c)) return { system: RESTRICTED_TIER_SYSTEM, code: 'r', display: 'Restricted (HIV)' };
  if (/^A5\d/.test(c) || /^A6[0-4]/.test(c)) return { system: RESTRICTED_TIER_SYSTEM, code: 'r', display: 'Restricted (STI)' };
  const l = (label ?? '').toLowerCase();
  if (/(hiv|aids)/.test(l)) return { system: RESTRICTED_TIER_SYSTEM, code: 'r', display: 'Restricted (HIV)' };
  if (/(depress|anxiety|psychiat|schizo|bipolar|mental health|substance use|addiction|suicid)/.test(l)) {
    return { system: RESTRICTED_TIER_SYSTEM, code: 'psy', display: 'Behavioral health' };
  }
  return null;
}

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
    severity: resource.severity?.text ?? resource.severity?.coding?.[0]?.display,
    bodySite: resource.bodySite?.[0]?.text ?? resource.bodySite?.[0]?.coding?.[0]?.display,
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
  // Paginate to completeness — the problem list feeds the safety header, and
  // entered-in-error records are filtered below, so a single fixed page could
  // hide active problems. `count` is the page size.
  const resources = await searchAllResources<ConditionResource>(
    'Condition',
    { patient: `Patient/${patientId}`, _sort: '-_lastUpdated' },
    { pageSize: count, maxResources: 1000 },
  );

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

  const verification = input.verificationStatus ?? 'confirmed';
  const severity = input.severity ?? null;
  const primaryCode =
    input.code ??
    resolvedCodeCodings.find((coding) => (coding.system ?? '').toLowerCase().includes('icd-10'))?.code ??
    resolvedCodeCodings[0]?.code ??
    null;
  const security = restrictedTierForCondition(primaryCode, input.label);

  return (await medplum.createResource({
    resourceType: 'Condition',
    meta: security ? { security: [security] } : undefined,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: CONDITION_VER_STATUS_SYSTEM, code: verification, display: VERIFICATION_DISPLAY[verification] }],
    },
    category: [{ coding: categoryCodings }],
    code: {
      coding: resolvedCodeCodings.length > 0 ? resolvedCodeCodings : undefined,
      text: input.label,
    },
    severity: severity
      ? { coding: [{ system: 'http://snomed.info/sct', ...SEVERITY_SNOMED[severity] }], text: SEVERITY_SNOMED[severity].display }
      : undefined,
    bodySite: input.bodySite ? [{ text: input.bodySite }] : undefined,
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