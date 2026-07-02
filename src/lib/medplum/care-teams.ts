import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type CareTeamParticipant = {
  role?: Array<{
    coding?: Array<{ system?: string; code?: string; display?: string }>;
  }>;
  member?: FhirReference;
};

export type MedplumCareTeamResource = {
  resourceType: 'CareTeam';
  id?: string;
  meta?: {
    versionId?: string;
  };
  status?: 'proposed' | 'active' | 'suspended' | 'inactive' | 'entered-in-error';
  category?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  subject?: FhirReference;
  participant?: CareTeamParticipant[];
  name?: string;
};

export type CareTeamMemberInput = {
  practitionerReference: string;
  display: string;
  roleCode: 'doctor' | 'nurse' | 'physiotherapist' | 'operator' | 'medical_ops' | 'admin' | 'superadmin';
};

function normalizeParticipantKey(participant: CareTeamParticipant): string | null {
  const ref = participant.member?.reference?.trim();
  if (!ref) return null;
  return ref.toLowerCase();
}

function roleDisplay(roleCode: CareTeamMemberInput['roleCode']): string {
  switch (roleCode) {
    case 'physiotherapist':
      return 'Physiotherapist';
    case 'medical_ops':
      return 'Medical Ops';
    case 'superadmin':
      return 'Superadmin';
    default:
      return roleCode.charAt(0).toUpperCase() + roleCode.slice(1);
  }
}

async function getActiveCareTeamByPatient(patientId: string): Promise<MedplumCareTeamResource | null> {
  const medplum = await getMedplumClient();

  return (await medplum.searchOne('CareTeam', {
    subject: `Patient/${patientId}`,
    status: 'active',
  })) as MedplumCareTeamResource | null;
}

export async function getActivePatientCareTeam(patientId: string): Promise<MedplumCareTeamResource | null> {
  return getActiveCareTeamByPatient(patientId);
}

export async function assignStaffToPatientCareTeam(
  patientId: string,
  input: CareTeamMemberInput,
  options?: { expectedVersionId?: string | null },
): Promise<MedplumCareTeamResource> {
  const medplum = await getMedplumClient();
  const existing = await getActiveCareTeamByPatient(patientId);

  const nextParticipant: CareTeamParticipant = {
    role: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.careTeamCategory,
            code: input.roleCode,
            display: roleDisplay(input.roleCode),
          },
        ],
      },
    ],
    member: {
      reference: input.practitionerReference,
      display: input.display,
    },
  };

  if (!existing?.id) {
    return (await medplum.createResource({
      resourceType: 'CareTeam',
      status: 'active',
      name: 'Anees Care Team',
      category: [
        {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.careTeamCategory,
              code: 'primary',
              display: 'Primary care team',
            },
          ],
        },
      ],
      subject: { reference: `Patient/${patientId}` },
      participant: [nextParticipant],
    } as never)) as MedplumCareTeamResource;
  }

  if (options?.expectedVersionId && existing.meta?.versionId !== options.expectedVersionId) {
    throw new Error('Care team was updated by another user. Please refresh and try again.');
  }

  const participants = existing.participant ?? [];
  const participantKeys = new Set(participants.map(normalizeParticipantKey).filter(Boolean));
  const incomingKey = nextParticipant.member?.reference?.toLowerCase();

  if (incomingKey && !participantKeys.has(incomingKey)) {
    participants.push(nextParticipant);
  }

  return (await medplum.updateResource({
    ...existing,
    participant: participants,
  } as never, {
    headers: options?.expectedVersionId
      ? { 'If-Match': `W/\"${options.expectedVersionId}\"` }
      : undefined,
  })) as MedplumCareTeamResource;
}

export async function unassignStaffFromPatientCareTeam(
  patientId: string,
  practitionerReference: string,
  options?: { expectedVersionId?: string | null },
): Promise<MedplumCareTeamResource | null> {
  const medplum = await getMedplumClient();
  const existing = await getActiveCareTeamByPatient(patientId);

  if (!existing?.id) {
    return null;
  }

  if (options?.expectedVersionId && existing.meta?.versionId !== options.expectedVersionId) {
    throw new Error('Care team was updated by another user. Please refresh and try again.');
  }

  const target = practitionerReference.toLowerCase();
  const filtered = (existing.participant ?? []).filter(
    (participant) => normalizeParticipantKey(participant) !== target,
  );

  return (await medplum.updateResource({
    ...existing,
    participant: filtered,
  } as never, {
    headers: options?.expectedVersionId
      ? { 'If-Match': `W/\"${options.expectedVersionId}\"` }
      : undefined,
  })) as MedplumCareTeamResource;
}

export async function listCareTeamPatientIdsForPractitioner(
  practitionerReference: string,
): Promise<string[]> {
  const medplum = await getMedplumClient();

  const teams = (await medplum.searchResources('CareTeam', {
    participant: practitionerReference,
    status: 'active',
    _count: '200',
  })) as MedplumCareTeamResource[];

  const patientIds = teams
    .map((team) => team.subject?.reference)
    .filter((reference): reference is string => !!reference && reference.startsWith('Patient/'))
    .map((reference) => reference.replace('Patient/', ''));

  return [...new Set(patientIds)];
}
