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
  identifier?: Array<{ system?: string; value?: string }>;
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

type VisitEncounterInput = {
  patientId: string;
  visitId: string;
  visitType: CreateMedplumEncounterInput['visitType'];
  startAt: Date;
  practitionerReference?: string | null;
  practitionerName?: string | null;
};

/**
 * Find the Encounter that wraps a given operational Visit. The link lives in
 * Medplum as a FHIR identifier (visit-id system) rather than a Postgres column,
 * so the clinical record stays self-describing and no schema migration is
 * needed to connect the two systems.
 */
export async function findEncounterByVisitId(visitId: string): Promise<MedplumEncounterResource | null> {
  const medplum = await getMedplumClient();
  const results = (await medplum.searchResources('Encounter', {
    identifier: `${MEDPLUM_CODE_SYSTEMS.visitId}|${visitId}`,
    _count: '1',
  })) as MedplumEncounterResource[];
  return results[0] ?? null;
}

/**
 * Ensure an `in-progress` Encounter exists for a visit (called at check-in).
 * Idempotent: returns the existing Encounter if one is already linked, so a
 * retry or a later check-out never creates a duplicate.
 */
export async function ensureVisitEncounter(input: VisitEncounterInput): Promise<MedplumEncounterResource> {
  const existing = await findEncounterByVisitId(input.visitId);
  if (existing) {
    return existing;
  }

  const medplum = await getMedplumClient();
  const encounterClass = encounterClassForVisitType(input.visitType);

  const encounter: MedplumEncounterResource = {
    resourceType: 'Encounter',
    identifier: [{ system: MEDPLUM_CODE_SYSTEMS.visitId, value: input.visitId }],
    status: 'in-progress',
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
    subject: { reference: `Patient/${input.patientId}` },
    participant: input.practitionerName
      ? [{ individual: { reference: input.practitionerReference ?? undefined, display: input.practitionerName } }]
      : undefined,
    period: { start: input.startAt.toISOString() },
  };

  return (await medplum.createResource(encounter as never)) as MedplumEncounterResource;
}

/**
 * Mark a visit's Encounter as completed (called at check-out — the "sign" step).
 * Returns null if no Encounter is linked. The status uses this server's
 * Encounter vocabulary ('completed').
 */
export async function finishVisitEncounter(input: { visitId: string; endAt: Date }): Promise<MedplumEncounterResource | null> {
  const existing = await findEncounterByVisitId(input.visitId);
  if (!existing?.id) {
    return null;
  }

  const medplum = await getMedplumClient();
  const updated: MedplumEncounterResource = {
    ...existing,
    status: 'completed',
    period: { ...(existing.period ?? {}), end: input.endAt.toISOString() },
  };

  return (await medplum.updateResource(updated as never)) as MedplumEncounterResource;
}

export async function listPatientEncounters(patientId: string, count = 25): Promise<MedplumEncounterResource[]> {
  const medplum = await getMedplumClient();

  return (await medplum.searchResources('Encounter', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-date',
  })) as MedplumEncounterResource[];
}
