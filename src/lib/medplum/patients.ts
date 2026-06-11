import 'server-only';

import { getMedplumClient } from './client';
import { MEDPLUM_CODE_SYSTEMS } from './constants';
import { EgyptianExtensions } from './fhir-extensions';

type FhirAdministrativeGender = 'male' | 'female' | 'other' | 'unknown';

type MedplumPatientResource = {
  resourceType: 'Patient';
  id?: string;
  meta?: {
    versionId?: string;
  };
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
  address?: Array<{
    use?: string;
    type?: string;
    text?: string;
    line?: string[];
    extension?: Array<{
      url: string;
      valueString?: string;
      valueUrl?: string;
    }>;
  }>;
  contact?: Array<{
    name?: {
      text?: string;
    };
    telecom?: Array<{
      system?: string;
      value?: string;
      use?: string;
    }>;
    relationship?: Array<{
      text?: string;
    }>;
  }>;
  gender?: FhirAdministrativeGender;
  birthDate?: string;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueUrl?: string;
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
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
};

type UpdateMedplumPatientDemographicsInput = {
  patientId: string;
  expectedVersionId?: string | null;
  addressDetail?: string | null;
  landmark?: string | null;
  addressMapUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  secondaryEmergencyContactName?: string | null;
  secondaryEmergencyContactPhone?: string | null;
  secondaryEmergencyContactRelation?: string | null;
};

type FhirExtension = NonNullable<MedplumPatientResource['extension']>[number];
type FhirAddress = NonNullable<MedplumPatientResource['address']>[number];
type FhirContact = NonNullable<MedplumPatientResource['contact']>[number];

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

function toOptionalString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function upsertExtension(
  existing: FhirExtension[] | undefined,
  url: string,
  next: FhirExtension | null,
): FhirExtension[] | undefined {
  const filtered = (existing ?? []).filter((extension) => extension.url !== url);

  if (next) {
    filtered.push(next);
  }

  return filtered.length > 0 ? filtered : undefined;
}

function buildHomeAddress(input: {
  addressDetail?: string | null;
  landmark?: string | null;
  addressMapUrl?: string | null;
}): FhirAddress | null {
  const addressDetail = toOptionalString(input.addressDetail);
  const landmark = toOptionalString(input.landmark);
  const addressMapUrl = toOptionalString(input.addressMapUrl);
  const line = [addressDetail, landmark].filter((value): value is string => !!value);

  if (line.length === 0 && !addressMapUrl) {
    return null;
  }

  return {
    use: 'home',
    type: 'both',
    text: line.length > 0 ? line.join(', ') : undefined,
    line: line.length > 0 ? line : undefined,
    extension: addressMapUrl
      ? [
          {
            url: EgyptianExtensions.addressMapUrl,
            valueUrl: addressMapUrl,
          },
        ]
      : undefined,
  };
}

function buildEmergencyContact(input: {
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
}): FhirContact | null {
  const name = toOptionalString(input.emergencyContactName);
  const phone = toOptionalString(input.emergencyContactPhone);
  const relation = toOptionalString(input.emergencyContactRelation);

  if (!name && !phone && !relation) {
    return null;
  }

  return {
    name: name ? { text: name } : undefined,
    telecom: phone
      ? [
          {
            system: 'phone',
            value: phone,
            use: 'mobile',
          },
        ]
      : undefined,
    relationship: relation ? [{ text: relation }] : undefined,
  };
}

function buildSecondaryEmergencyContact(input: {
  secondaryEmergencyContactName?: string | null;
  secondaryEmergencyContactPhone?: string | null;
  secondaryEmergencyContactRelation?: string | null;
}): FhirContact | null {
  const name = toOptionalString(input.secondaryEmergencyContactName);
  const phone = toOptionalString(input.secondaryEmergencyContactPhone);
  const relation = toOptionalString(input.secondaryEmergencyContactRelation);

  if (!name && !phone && !relation) {
    return null;
  }

  return {
    name: name ? { text: name } : undefined,
    telecom: phone
      ? [
          {
            system: 'phone',
            value: phone,
            use: 'mobile',
          },
        ]
      : undefined,
    relationship: relation ? [{ text: relation }] : undefined,
  };
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

export async function updateMedplumPatientDemographics(
  input: UpdateMedplumPatientDemographicsInput,
): Promise<MedplumPatientResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('Patient', input.patientId)) as MedplumPatientResource;

  if (input.expectedVersionId && existing.meta?.versionId !== input.expectedVersionId) {
    throw new Error('Patient demographics were updated by another user. Please refresh and try again.');
  }

  const nextHomeAddress = buildHomeAddress(input);
  const nextEmergencyContact = buildEmergencyContact(input);
  const nextSecondaryEmergencyContact = buildSecondaryEmergencyContact(input);
  const existingAddresses = existing.address ?? [];
  const homeAddressIndex = existingAddresses.findIndex((address) => address.use === 'home');
  const nextAddresses = [...existingAddresses];

  const existingContacts = existing.contact ?? [];
  const nextContacts = [] as FhirContact[];

  if (nextHomeAddress) {
    if (homeAddressIndex >= 0) {
      const currentHomeAddress = nextAddresses[homeAddressIndex] ?? {};
      nextAddresses[homeAddressIndex] = {
        ...currentHomeAddress,
        ...nextHomeAddress,
        extension: upsertExtension(
          currentHomeAddress.extension,
          EgyptianExtensions.addressMapUrl,
          nextHomeAddress.extension?.[0] ?? null,
        ),
      };
    } else {
      nextAddresses.push(nextHomeAddress);
    }
  } else if (homeAddressIndex >= 0) {
    nextAddresses.splice(homeAddressIndex, 1);
  }

  if (nextEmergencyContact) {
    nextContacts.push(nextEmergencyContact);
  }

  if (nextSecondaryEmergencyContact) {
    nextContacts.push(nextSecondaryEmergencyContact);
  }

  nextContacts.push(...existingContacts.slice(2));

  return (await medplum.updateResource(
    {
      ...existing,
      address: nextAddresses.length > 0 ? nextAddresses : undefined,
      contact: nextContacts.length > 0 ? nextContacts : undefined,
    } as never,
    {
      headers: input.expectedVersionId
        ? { 'If-Match': `W/\"${input.expectedVersionId}\"` }
        : undefined,
    },
  )) as MedplumPatientResource;
}