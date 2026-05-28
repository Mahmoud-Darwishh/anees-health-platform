import 'server-only';

import { getMedplumClient } from './client';
import { EgyptianExtensions } from './fhir-extensions';

const ANEES_PATIENT_CODE_SYSTEM = 'https://anees.health/fhir/identifier/patient-code';

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
        system: ANEES_PATIENT_CODE_SYSTEM,
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

export async function upsertMedplumPatient(input: SyncMedplumPatientInput) {
  const medplum = await getMedplumClient();
  const existing = await medplum.searchOne('Patient', {
    identifier: `${ANEES_PATIENT_CODE_SYSTEM}|${input.code}`,
  });

  const nextPatient = buildMedplumPatientResource(input);

  if (existing?.id) {
    return medplum.updateResource({
      ...existing,
      ...nextPatient,
      id: existing.id,
    } as never);
  }

  return medplum.createResource(nextPatient as never);
}