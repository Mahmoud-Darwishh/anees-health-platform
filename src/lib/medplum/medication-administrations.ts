import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

type MedplumMedicationAdministrationResource = {
  resourceType: 'MedicationAdministration';
  id?: string;
  status:
    | 'in-progress'
    | 'not-done'
    | 'on-hold'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'unknown';
  category?: { coding?: FhirCoding[]; text?: string };
  medicationCodeableConcept?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  context?: FhirReference;
  effectiveDateTime?: string;
  performer?: Array<{
    actor?: FhirReference;
  }>;
  note?: Array<{ text?: string }>;
  reasonCode?: Array<{ coding?: FhirCoding[]; text?: string }>;
  supportingInformation?: FhirReference[];
  extension?: Array<{
    url?: string;
    valueDateTime?: string;
  }>;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
};

export type MedicationAdministrationStatus = 'given' | 'refused' | 'held';

export type MedicationAdministrationSummary = {
  id: string;
  medication: string;
  status: MedicationAdministrationStatus;
  scheduledAt: string | null;
  administeredAt: string | null;
  recordedBy: string | null;
  reason: string | null;
  note: string | null;
  medicationStatementId: string | null;
};

export type CreateMedicationAdministrationInput = {
  patientId: string;
  medicationStatementId?: string | null;
  medicationName: string;
  encounterId?: string | null;
  scheduledAt?: Date | null;
  administeredAt: Date;
  administrationStatus: MedicationAdministrationStatus;
  reason?: string | null;
  note?: string | null;
  performerReference: string;
  performerDisplay?: string | null;
};

function statusToFhir(status: MedicationAdministrationStatus): MedplumMedicationAdministrationResource['status'] {
  if (status === 'given') return 'completed';
  if (status === 'refused') return 'not-done';
  return 'on-hold';
}

function fhirToStatus(status: MedplumMedicationAdministrationResource['status']): MedicationAdministrationStatus {
  if (status === 'completed') return 'given';
  if (status === 'not-done') return 'refused';
  return 'held';
}

function mapSummary(resource: MedplumMedicationAdministrationResource): MedicationAdministrationSummary | null {
  if (!resource.id) {
    return null;
  }

  const supporting = resource.supportingInformation?.find((entry) => entry.reference?.startsWith('MedicationStatement/'));
  const scheduledAt = resource.extension?.find(
    (entry) => entry.url === 'https://anees.health/fhir/StructureDefinition/mar-scheduled-at',
  )?.valueDateTime;

  return {
    id: resource.id,
    medication:
      resource.medicationCodeableConcept?.text ??
      resource.medicationCodeableConcept?.coding?.[0]?.display ??
      resource.medicationCodeableConcept?.coding?.[0]?.code ??
      'Medication',
    status: fhirToStatus(resource.status),
    scheduledAt: scheduledAt ?? null,
    administeredAt: resource.effectiveDateTime ?? null,
    recordedBy: resource.performer?.[0]?.actor?.display ?? resource.performer?.[0]?.actor?.reference ?? null,
    reason: resource.reasonCode?.[0]?.text ?? resource.reasonCode?.[0]?.coding?.[0]?.display ?? null,
    note: resource.note?.[0]?.text ?? null,
    medicationStatementId: supporting?.reference?.replace('MedicationStatement/', '') ?? null,
  };
}

export async function createMedicationAdministrationRecord(
  input: CreateMedicationAdministrationInput,
): Promise<MedicationAdministrationSummary> {
  const medplum = await getMedplumClient();
  const supportingInformation: FhirReference[] = [];

  if (input.medicationStatementId) {
    supportingInformation.push({ reference: `MedicationStatement/${input.medicationStatementId}` });
  }

  const created = (await medplum.createResource({
    resourceType: 'MedicationAdministration',
    status: statusToFhir(input.administrationStatus),
    category: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.taskType,
          code: 'mar',
          display: 'Medication Administration Record',
        },
      ],
      text: 'Medication Administration Record',
    },
    medicationCodeableConcept: {
      text: input.medicationName,
    },
    subject: {
      reference: `Patient/${input.patientId}`,
    },
    context: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    effectiveDateTime: input.administeredAt.toISOString(),
    performer: [
      {
        actor: {
          reference: input.performerReference,
          display: input.performerDisplay ?? undefined,
        },
      },
    ],
    note: input.note ? [{ text: input.note }] : undefined,
    reasonCode:
      input.administrationStatus === 'given'
        ? undefined
        : [
            {
              text: input.reason ?? 'No reason provided',
            },
          ],
    supportingInformation: supportingInformation.length > 0 ? supportingInformation : undefined,
    extension: input.scheduledAt
      ? [
          {
            url: 'https://anees.health/fhir/StructureDefinition/mar-scheduled-at',
            valueDateTime: input.scheduledAt.toISOString(),
          },
        ]
      : undefined,
  } as never)) as MedplumMedicationAdministrationResource;

  const summary = mapSummary(created);
  if (!summary) {
    throw new Error('Failed to persist MAR administration record.');
  }

  return summary;
}

export async function listMedicationAdministrationRecords(
  patientId: string,
  count = 80,
): Promise<MedicationAdministrationSummary[]> {
  const medplum = await getMedplumClient();
  const resources = (await medplum.searchResources('MedicationAdministration', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as MedplumMedicationAdministrationResource[];

  return resources.map(mapSummary).filter((entry): entry is MedicationAdministrationSummary => !!entry);
}
