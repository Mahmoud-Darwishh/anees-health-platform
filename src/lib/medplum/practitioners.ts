import 'server-only';

import type { StaffRole } from '@prisma/client';
import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';
import { prisma } from '@/lib/db/prisma';

type MedplumPractitionerResource = {
  resourceType: 'Practitioner';
  id?: string;
  active?: boolean;
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{ use?: string; text?: string }>;
  telecom?: Array<{ system?: string; value?: string; use?: string }>;
  qualification?: Array<{
    code?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
  }>;
};

export type EnsurePractitionerInput = {
  staffId: string;
  name: string;
  email?: string | null;
  role?: StaffRole | null;
  cachedPractitionerId?: string | null;
};

export type MedplumPractitionerRef = {
  id: string;
  reference: string;
  display: string;
};

function roleDisplay(role?: StaffRole | null): string | undefined {
  if (!role) return undefined;
  return role.replace('_', ' ');
}

function buildPractitionerResource(input: EnsurePractitionerInput): MedplumPractitionerResource {
  return {
    resourceType: 'Practitioner',
    active: true,
    identifier: [
      {
        system: MEDPLUM_CODE_SYSTEMS.staffId,
        value: input.staffId,
      },
    ],
    name: [
      {
        use: 'official',
        text: input.name,
      },
    ],
    telecom: input.email
      ? [
          {
            system: 'email',
            value: input.email,
            use: 'work',
          },
        ]
      : undefined,
    qualification: input.role
      ? [
          {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.staffRole,
                  code: input.role,
                  display: roleDisplay(input.role),
                },
              ],
              text: roleDisplay(input.role),
            },
          },
        ]
      : undefined,
  };
}

export async function ensureMedplumPractitionerForStaff(
  input: EnsurePractitionerInput,
): Promise<MedplumPractitionerRef> {
  const medplum = await getMedplumClient();
  const nextResource = buildPractitionerResource(input);

  if (input.cachedPractitionerId) {
    try {
      const existingById = (await medplum.readResource(
        'Practitioner',
        input.cachedPractitionerId,
      )) as MedplumPractitionerResource;
      const savedById = (await medplum.updateResource({
        ...existingById,
        ...nextResource,
        id: existingById.id,
      } as never)) as MedplumPractitionerResource;

      if (!savedById.id) {
        throw new Error('Failed to resolve Medplum practitioner id');
      }

      return {
        id: savedById.id,
        reference: `Practitioner/${savedById.id}`,
        display: input.name,
      };
    } catch {
      // Cached id may be stale after env resets; fall back to identifier search.
    }
  }

  const existing = (await medplum.searchOne('Practitioner', {
    identifier: `${MEDPLUM_CODE_SYSTEMS.staffId}|${input.staffId}`,
  })) as MedplumPractitionerResource | null;

  const saved = existing?.id
    ? ((await medplum.updateResource({
        ...existing,
        ...nextResource,
        id: existing.id,
      } as never)) as MedplumPractitionerResource)
    : ((await medplum.createResource(nextResource as never)) as MedplumPractitionerResource);

  if (!saved.id) {
    throw new Error('Failed to resolve Medplum practitioner id');
  }

  return {
    id: saved.id,
    reference: `Practitioner/${saved.id}`,
    display: input.name,
  };
}

export async function ensureCachedMedplumPractitionerForStaff(
  input: Omit<EnsurePractitionerInput, 'cachedPractitionerId'>,
): Promise<MedplumPractitionerRef> {
  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { medplumPractitionerId: true },
  });

  const practitioner = await ensureMedplumPractitionerForStaff({
    ...input,
    cachedPractitionerId: staff?.medplumPractitionerId ?? null,
  });

  // The session can reference a stale/deleted staff id; avoid write-not-found crashes.
  if (staff && staff.medplumPractitionerId !== practitioner.id) {
    await prisma.staff.update({
      where: { id: input.staffId },
      data: { medplumPractitionerId: practitioner.id },
    });
  }

  return practitioner;
}
