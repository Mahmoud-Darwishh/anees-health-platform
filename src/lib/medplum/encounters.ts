import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

export type MedplumEncounterStatus =
  | 'planned'
  | 'in-progress'
  | 'on-hold'
  | 'discharged'
  | 'completed'
  | 'cancelled'
  | 'discontinued'
  | 'entered-in-error'
  | 'unknown';

type EncounterClassCode = 'HH' | 'AMB' | 'VR';

type FhirReference = {
  reference?: string;
  display?: string;
};

type MedplumEncounterResource = {
  resourceType: 'Encounter';
  id?: string;
  status: MedplumEncounterStatus;
  class?: {
    system?: string;
    code?: string;
    display?: string;
  };
  serviceType?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  subject: FhirReference;
  participant?: Array<{
    individual?: FhirReference;
  }>;
  period?: {
    start?: string;
    end?: string;
  };
  note?: Array<{ text?: string }>;
};

type CreateMedplumEncounterInput = {
  patientId: string;
  status: MedplumEncounterStatus;
  start: Date;
  visitType: 'in_home' | 'clinic' | 'virtual';
  recordedByReference?: string | null;
  recordedByName?: string | null;
  notes?: string | null;
};

function encounterClassForVisitType(visitType: CreateMedplumEncounterInput['visitType']): {
  code: EncounterClassCode;
  display: string;
} {
  switch (visitType) {
    case 'clinic':
      return { code: 'AMB', display: 'ambulatory' };
    case 'virtual':
      return { code: 'VR', display: 'virtual' };
    case 'in_home':
    default:
      return { code: 'HH', display: 'home health' };
  }
}

export async function createMedplumEncounter(
  input: CreateMedplumEncounterInput,
): Promise<MedplumEncounterResource> {
  const medplum = await getMedplumClient();
  const encounterClass = encounterClassForVisitType(input.visitType);

  const encounter: MedplumEncounterResource = {
    resourceType: 'Encounter',
    status: input.status,
    class: {
      system: MEDPLUM_CODE_SYSTEMS.v3ActCode,
      code: encounterClass.code,
      display: encounterClass.display,
    },
    serviceType: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.encounterType,
            code: input.visitType,
            display: input.visitType.replace('_', ' '),
          },
        ],
      },
    ],
    subject: {
      reference: `Patient/${input.patientId}`,
    },
    participant: input.recordedByName
      ? [
          {
            individual: {
              reference: input.recordedByReference ?? undefined,
              display: input.recordedByName,
            },
          },
        ]
      : undefined,
    period: {
      start: input.start.toISOString(),
    },
    note: input.notes
      ? [
          {
            text: input.notes,
          },
        ]
      : undefined,
  };

  return (await medplum.createResource(encounter as never)) as MedplumEncounterResource;
}

export async function listPatientEncounters(patientId: string, count = 25): Promise<MedplumEncounterResource[]> {
  const medplum = await getMedplumClient();

  return (await medplum.searchResources('Encounter', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-date',
  })) as MedplumEncounterResource[];
}
