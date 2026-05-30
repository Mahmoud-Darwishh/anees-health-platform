import 'server-only';

import { getMedplumClient } from './client';
import { MEDPLUM_CODE_SYSTEMS } from './constants';
import { EgyptianExtensions } from './fhir-extensions';

type FhirAdministrativeGender = 'male' | 'female' | 'other' | 'unknown';

type MedplumPatientResource = {
  resourceType: 'Patient';
  id?: string;
  active?: boolean;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  name?: Array<{
    use?: string;
    text?: string;
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  gender?: FhirAdministrativeGender;
  birthDate?: string;
  extension?: Array<{
    url: string;
    valueString?: string;
  }>;
};

type SyncMedplumPatientInput = {
  code: string;
  fullName: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  nationalId?: string | null;
  /** Previously stored Medplum Patient id, if we already synced this patient. */
  medplumPatientId?: string | null;
};

function toFhirGender(value?: string | null): FhirAdministrativeGender | undefined {
  if (!value) {
    return undefined;
  }

  switch (value.toLowerCase()) {
    case 'male':
    case 'female':
    case 'other':
    case 'unknown':
      return value.toLowerCase() as FhirAdministrativeGender;
    default:
      return undefined;
  }
}

function toBirthDate(value?: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function buildMedplumPatientResource(input: SyncMedplumPatientInput): MedplumPatientResource {
  const patient: MedplumPatientResource = {
    resourceType: 'Patient',
    active: true,
    identifier: [
      {
        system: MEDPLUM_CODE_SYSTEMS.patientCode,
        value: input.code,
      },
    ],
    name: [
      {
        use: 'official',
        text: input.fullName,
      },
    ],
    telecom: input.phone
      ? [
          {
            system: 'phone',
            value: input.phone,
            use: 'mobile',
          },
        ]
      : undefined,
    gender: toFhirGender(input.gender),
    birthDate: toBirthDate(input.dateOfBirth),
    extension: input.nationalId
      ? [
          {
            url: EgyptianExtensions.nationalId,
            valueString: input.nationalId,
          },
        ]
      : undefined,
  };

  return patient;
}

export async function listMedplumPatients() {
  const medplum = await getMedplumClient();

  return medplum.searchResources('Patient', {
    _count: '20',
    _sort: '-_lastUpdated',
  });
}

export async function getMedplumPatient(patientId: string) {
  const medplum = await getMedplumClient();

  return medplum.readResource('Patient', patientId);
}

export async function upsertMedplumPatient(
  input: SyncMedplumPatientInput,
): Promise<MedplumPatientResource> {
  const medplum = await getMedplumClient();

  // Prefer a direct read by stored Medplum id (idempotent, no search round-trip).
  if (input.medplumPatientId) {
    try {
      const byId = (await medplum.readResource(
        'Patient',
        input.medplumPatientId,
      )) as MedplumPatientResource;
      const nextPatient = buildMedplumPatientResource(input);
      return (await medplum.updateResource({
        ...byId,
        ...nextPatient,
        id: byId.id,
      } as never)) as MedplumPatientResource;
    } catch {
      // Stored id no longer resolves (e.g. project reset) — fall back to identifier search.
    }
  }

  const existing = await medplum.searchOne('Patient', {
    identifier: `${MEDPLUM_CODE_SYSTEMS.patientCode}|${input.code}`,
  });

  const nextPatient = buildMedplumPatientResource(input);

  if (existing?.id) {
    return (await medplum.updateResource({
      ...existing,
      ...nextPatient,
      id: existing.id,
    } as never)) as MedplumPatientResource;
  }

  return (await medplum.createResource(nextPatient as never)) as MedplumPatientResource;
}