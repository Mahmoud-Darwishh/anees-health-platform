import 'server-only';

import { getMedplumClient } from './client';
import { isRestrictedTierClinicalCoding, isRestrictedTierSecurityCoding, FHIR_INTERPRETATION_SYSTEM } from './constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

export type ServiceRequestResource = {
  resourceType: 'ServiceRequest';
  id?: string;
  meta?: {
    security?: FhirCoding[];
  };
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  authoredOn?: string;
  occurrenceDateTime?: string;
  occurrencePeriod?: { start?: string; end?: string };
  requester?: FhirReference;
  note?: Array<{ text?: string }>;
};

export type DiagnosticReportResource = {
  resourceType: 'DiagnosticReport';
  id?: string;
  meta?: {
    security?: FhirCoding[];
  };
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  encounter?: FhirReference;
  basedOn?: FhirReference[];
  effectiveDateTime?: string;
  issued?: string;
  performer?: FhirReference[];
  result?: FhirReference[];
  conclusion?: string;
  conclusionCode?: Array<{ coding?: FhirCoding[]; text?: string }>;
};

export type LabOrderSummary = {
  id: string;
  title: string;
  status: ServiceRequestResource['status'];
  category?: string;
  authoredOn?: string;
  occurrence?: string;
  note?: string;
  restrictedTier: boolean;
};

export type LabResultSummary = {
  id: string;
  title: string;
  status: DiagnosticReportResource['status'];
  category?: string;
  effective?: string;
  issued?: string;
  conclusion?: string;
  performer?: string;
  restrictedTier: boolean;
};

export type CreateLabOrderInput = {
  patientId: string;
  title: string;
  category?: 'lab' | 'imaging' | 'other';
  code?: string | null;
  note?: string | null;
  requestedOn?: Date | null;
  requestedByReference?: string | null;
  requestedByDisplay?: string | null;
};

export type CreateDiagnosticReportInput = {
  patientId: string;
  title: string;
  category?: 'lab' | 'imaging' | 'other';
  status?: DiagnosticReportResource['status'];
  conclusion?: string | null;
  note?: string | null;
  effectiveDate?: Date | null;
  issuedDate?: Date | null;
  linkedOrderId?: string | null;
  performerReference?: string | null;
  performerDisplay?: string | null;
};

function firstCode(resource?: { coding?: FhirCoding[]; text?: string }): string {
  return resource?.text ?? resource?.coding?.[0]?.display ?? resource?.coding?.[0]?.code ?? 'Result';
}

function firstCategory(category?: Array<{ coding?: FhirCoding[] }>): string | undefined {
  return category?.[0]?.coding?.[0]?.display ?? category?.[0]?.coding?.[0]?.code;
}

function categoryCoding(category?: 'lab' | 'imaging' | 'other'): { coding: FhirCoding[] }[] | undefined {
  if (!category || category === 'other') return undefined;

  return [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/service-request-category',
          code: category === 'lab' ? 'laboratory' : 'imaging',
          display: category === 'lab' ? 'Laboratory' : 'Imaging',
        },
      ],
    },
  ];
}

export async function listPatientLabOrders(patientId: string, count = 20): Promise<LabOrderSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('ServiceRequest', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as ServiceRequestResource[];

  return resources
    .filter((resource) => !!resource.id)
    .map((resource) => {
      const securityCoding = resource.meta?.security ?? [];
      const categoryCoding = resource.category?.flatMap((item) => item.coding ?? []) ?? [];
      const codeCoding = resource.code?.coding ?? [];
      const restrictedTier = [
        ...securityCoding.map((coding) => isRestrictedTierSecurityCoding(coding)),
        ...categoryCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
        ...codeCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
      ].some(Boolean);

      return {
        id: resource.id as string,
        title: firstCode(resource.code),
        status: resource.status,
        category: firstCategory(resource.category),
        authoredOn: resource.authoredOn,
        occurrence: resource.occurrenceDateTime ?? resource.occurrencePeriod?.start,
        note: resource.note?.[0]?.text,
        restrictedTier,
      };
    });
}

export async function listPatientDiagnosticReports(patientId: string, count = 20): Promise<LabResultSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('DiagnosticReport', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as DiagnosticReportResource[];

  return resources
    .filter((resource) => !!resource.id)
    .map((resource) => {
      const securityCoding = resource.meta?.security ?? [];
      const categoryCoding = resource.category?.flatMap((item) => item.coding ?? []) ?? [];
      const codeCoding = resource.code?.coding ?? [];
      const conclusionCoding = resource.conclusionCode?.flatMap((item) => item.coding ?? []) ?? [];
      const restrictedTier = [
        ...securityCoding.map((coding) => isRestrictedTierSecurityCoding(coding)),
        ...categoryCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
        ...codeCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
        ...conclusionCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
      ].some(Boolean);

      return {
        id: resource.id as string,
        title: firstCode(resource.code),
        status: resource.status,
        category: firstCategory(resource.category),
        effective: resource.effectiveDateTime,
        issued: resource.issued,
        conclusion: resource.conclusion,
        performer: resource.performer?.[0]?.display ?? resource.performer?.[0]?.reference,
        restrictedTier,
      };
    });
}

export async function createPatientLabOrder(input: CreateLabOrderInput): Promise<ServiceRequestResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    category: categoryCoding(input.category),
    code: {
      text: input.title,
      coding: input.code
        ? [
            {
              system: 'https://anees.health/fhir/lab-request-code',
              code: input.code,
              display: input.title,
            },
          ]
        : undefined,
    },
    subject: { reference: `Patient/${input.patientId}` },
    authoredOn: (input.requestedOn ?? new Date()).toISOString(),
    requester: input.requestedByReference
      ? { reference: input.requestedByReference, display: input.requestedByDisplay ?? undefined }
      : undefined,
    note: input.note ? [{ text: input.note }] : undefined,
  } as never)) as ServiceRequestResource;
}

// ── Discrete coded lab results (Phase 7) ─────────────────────────────────────

type LabResultObservationResource = {
  resourceType: 'Observation';
  id?: string;
  status: 'final' | 'preliminary' | 'amended' | 'corrected' | 'entered-in-error';
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  effectiveDateTime?: string;
  performer?: FhirReference[];
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  interpretation?: Array<{ coding?: FhirCoding[] }>;
  referenceRange?: Array<{ low?: { value?: number; unit?: string }; high?: { value?: number; unit?: string } }>;
  basedOn?: FhirReference[];
};

export type LabResultValueSummary = {
  id: string;
  analyte: string;
  loinc?: string;
  value: number | null;
  unit?: string;
  flag?: 'L' | 'N' | 'H';
  referenceRange?: string;
  effective?: string;
};

export type CreateLabResultObservationInput = {
  patientId: string;
  analyteLabel: string;
  loinc: string;
  value: number;
  unit: string;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  flag: 'L' | 'N' | 'H';
  basedOnOrderId?: string | null;
  effectiveDate?: Date | null;
  performerReference?: string | null;
  performerDisplay?: string | null;
};

/** Create a discrete, LOINC-coded lab result Observation with a reference range + abnormal flag. */
export async function createLabResultObservation(
  input: CreateLabResultObservationInput,
): Promise<LabResultObservationResource> {
  const medplum = await getMedplumClient();

  const referenceRange =
    typeof input.referenceLow === 'number' || typeof input.referenceHigh === 'number'
      ? [
          {
            low: typeof input.referenceLow === 'number' ? { value: input.referenceLow, unit: input.unit } : undefined,
            high: typeof input.referenceHigh === 'number' ? { value: input.referenceHigh, unit: input.unit } : undefined,
          },
        ]
      : undefined;

  const interpretationDisplay = input.flag === 'H' ? 'High' : input.flag === 'L' ? 'Low' : 'Normal';

  return (await medplum.createResource({
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: input.loinc, display: input.analyteLabel }], text: input.analyteLabel },
    subject: { reference: `Patient/${input.patientId}` },
    effectiveDateTime: (input.effectiveDate ?? new Date()).toISOString(),
    performer: input.performerReference ? [{ reference: input.performerReference, display: input.performerDisplay ?? undefined }] : undefined,
    valueQuantity: { value: input.value, unit: input.unit, system: 'http://unitsofmeasure.org', code: input.unit },
    interpretation: [{ coding: [{ system: FHIR_INTERPRETATION_SYSTEM, code: input.flag, display: interpretationDisplay }] }],
    referenceRange,
    basedOn: input.basedOnOrderId ? [{ reference: `ServiceRequest/${input.basedOnOrderId}` }] : undefined,
  } as never)) as LabResultObservationResource;
}

/** Link a discrete result Observation into a DiagnosticReport's `result[]`. */
export async function attachResultToDiagnosticReport(reportId: string, observationId: string): Promise<void> {
  const medplum = await getMedplumClient();
  const report = (await medplum.readResource('DiagnosticReport', reportId)) as DiagnosticReportResource;
  const result = [...(report.result ?? []), { reference: `Observation/${observationId}` }];
  await medplum.updateResource({ ...report, result } as never);
}

/** All discrete lab result values for a patient, newest-first (for trend/display). */
export async function listPatientLabResultObservations(patientId: string, count = 80): Promise<LabResultValueSummary[]> {
  const medplum = await getMedplumClient();
  const rows = (await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    category: 'laboratory',
    _count: String(count),
    _sort: '-date',
  })) as LabResultObservationResource[];

  return rows
    .filter((row) => !!row.id && row.status !== 'entered-in-error')
    .map((row) => {
      const rr = row.referenceRange?.[0];
      const range = rr
        ? `${rr.low?.value ?? ''}${rr.low && rr.high ? '–' : ''}${rr.high?.value ?? ''} ${row.valueQuantity?.unit ?? ''}`.trim()
        : undefined;
      const code = row.interpretation?.[0]?.coding?.[0]?.code;
      return {
        id: row.id as string,
        analyte: row.code?.text ?? row.code?.coding?.[0]?.display ?? 'Result',
        loinc: row.code?.coding?.find((c) => (c.system ?? '').includes('loinc'))?.code,
        value: typeof row.valueQuantity?.value === 'number' ? row.valueQuantity.value : null,
        unit: row.valueQuantity?.unit,
        flag: code === 'L' || code === 'N' || code === 'H' ? (code as 'L' | 'N' | 'H') : undefined,
        referenceRange: range,
        effective: row.effectiveDateTime,
      };
    });
}

export async function createPatientDiagnosticReport(
  input: CreateDiagnosticReportInput,
): Promise<DiagnosticReportResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'DiagnosticReport',
    status: input.status ?? 'final',
    category: categoryCoding(input.category),
    code: {
      text: input.title,
    },
    subject: { reference: `Patient/${input.patientId}` },
    effectiveDateTime: input.effectiveDate?.toISOString(),
    issued: input.issuedDate?.toISOString(),
    basedOn: input.linkedOrderId ? [{ reference: `ServiceRequest/${input.linkedOrderId}` }] : undefined,
    performer: input.performerReference
      ? [{ reference: input.performerReference, display: input.performerDisplay ?? undefined }]
      : undefined,
    conclusion: input.conclusion ?? undefined,
    conclusionCode: input.note ? [{ text: input.note }] : undefined,
  } as never)) as DiagnosticReportResource;
}