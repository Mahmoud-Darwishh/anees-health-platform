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

export type ServiceRequestResource = {
  resourceType: 'ServiceRequest';
  id?: string;
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
    .map((resource) => ({
      id: resource.id as string,
      title: firstCode(resource.code),
      status: resource.status,
      category: firstCategory(resource.category),
      authoredOn: resource.authoredOn,
      occurrence: resource.occurrenceDateTime ?? resource.occurrencePeriod?.start,
      note: resource.note?.[0]?.text,
    }));
}

export async function listPatientDiagnosticReports(patientId: string, count = 20): Promise<LabResultSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('DiagnosticReport', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-effective-date',
  })) as DiagnosticReportResource[];

  return resources
    .filter((resource) => !!resource.id)
    .map((resource) => ({
      id: resource.id as string,
      title: firstCode(resource.code),
      status: resource.status,
      category: firstCategory(resource.category),
      effective: resource.effectiveDateTime,
      issued: resource.issued,
      conclusion: resource.conclusion,
      performer: resource.performer?.[0]?.display ?? resource.performer?.[0]?.reference,
    }));
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