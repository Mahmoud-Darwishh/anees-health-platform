import 'server-only';

import { getActivePatientCareTeam } from '@/lib/medplum/care-teams';
import { prisma } from '@/lib/db/prisma';

export async function resolveDoctorOwnerReference(patientId: string): Promise<{ reference: string; display?: string } | null> {
  const careTeam = await getActivePatientCareTeam(patientId);
  const doctorParticipant = careTeam?.participant?.find((participant) => {
    const roleCode = participant.role?.[0]?.coding?.[0]?.code;
    return roleCode === 'doctor';
  });

  const reference = doctorParticipant?.member?.reference;
  if (!reference) {
    return null;
  }

  return {
    reference,
    display: doctorParticipant?.member?.display ?? undefined,
  };
}

export async function resolveComplianceOwnerReference(): Promise<{ reference: string; display?: string } | null> {
  const compliance = await prisma.staff.findFirst({
    where: {
      role: 'compliance_officer',
      status: 'active',
      medplumPractitionerId: {
        not: null,
      },
    },
    select: {
      medplumPractitionerId: true,
      name: true,
    },
  });

  if (!compliance?.medplumPractitionerId) {
    return null;
  }

  return {
    reference: `Practitioner/${compliance.medplumPractitionerId}`,
    display: compliance.name,
  };
}

export async function resolveAdminOwnerReferences(): Promise<Array<{ reference: string; display?: string }>> {
  const admins = await prisma.staff.findMany({
    where: {
      role: {
        in: ['admin', 'superadmin'],
      },
      status: 'active',
      medplumPractitionerId: {
        not: null,
      },
    },
    select: {
      medplumPractitionerId: true,
      name: true,
    },
    take: 5,
  });

  return admins
    .filter((entry) => !!entry.medplumPractitionerId)
    .map((entry) => ({
      reference: `Practitioner/${entry.medplumPractitionerId as string}`,
      display: entry.name,
    }));
}
