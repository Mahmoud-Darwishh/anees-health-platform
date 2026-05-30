import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type AppointmentParticipant = {
  actor?: FhirReference;
  status?: 'accepted' | 'declined' | 'tentative' | 'needs-action';
};

export type MedplumAppointmentResource = {
  resourceType: 'Appointment';
  id?: string;
  meta?: {
    versionId?: string;
  };
  status: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow' | 'entered-in-error' | 'checked-in' | 'waitlist';
  description?: string;
  start?: string;
  end?: string;
  created?: string;
  serviceType?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  participant?: AppointmentParticipant[];
};

export type AppointmentSummary = {
  id: string;
  status: string;
  start: string | null;
  end: string | null;
  type: 'in_home' | 'clinic' | 'virtual' | 'other';
  description: string | null;
  assignedTo: string | null;
};

type CreatePatientAppointmentInput = {
  patientId: string;
  startAt: Date;
  endAt: Date;
  visitType: 'in_home' | 'clinic' | 'virtual';
  note?: string | null;
  practitionerReference?: string | null;
  practitionerDisplay?: string | null;
};

function toVisitTypeLabel(type: CreatePatientAppointmentInput['visitType']): string {
  switch (type) {
    case 'in_home':
      return 'In-home';
    case 'clinic':
      return 'Clinic';
    case 'virtual':
      return 'Virtual';
    default:
      return 'In-home';
  }
}

function toSummaryType(appointment: MedplumAppointmentResource): AppointmentSummary['type'] {
  const code = appointment.serviceType?.[0]?.coding?.[0]?.code;
  if (code === 'in_home' || code === 'clinic' || code === 'virtual') {
    return code;
  }
  return 'other';
}

function mapAppointmentSummary(appointment: MedplumAppointmentResource): AppointmentSummary | null {
  if (!appointment.id) {
    return null;
  }

  const assignedParticipant = appointment.participant?.find((participant) =>
    participant.actor?.reference?.startsWith('Practitioner/'),
  );

  return {
    id: appointment.id,
    status: appointment.status,
    start: appointment.start ?? null,
    end: appointment.end ?? null,
    type: toSummaryType(appointment),
    description: appointment.description ?? null,
    assignedTo: assignedParticipant?.actor?.display ?? assignedParticipant?.actor?.reference ?? null,
  };
}

export async function createPatientAppointment(input: CreatePatientAppointmentInput): Promise<MedplumAppointmentResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'Appointment',
    status: 'booked',
    description: input.note ?? undefined,
    start: input.startAt.toISOString(),
    end: input.endAt.toISOString(),
    created: new Date().toISOString(),
    serviceType: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.encounterType,
            code: input.visitType,
            display: toVisitTypeLabel(input.visitType),
          },
        ],
      },
    ],
    participant: [
      {
        actor: { reference: `Patient/${input.patientId}` },
        status: 'accepted',
      },
      input.practitionerReference
        ? {
            actor: {
              reference: input.practitionerReference,
              display: input.practitionerDisplay ?? undefined,
            },
            status: 'accepted',
          }
        : undefined,
    ].filter(Boolean) as AppointmentParticipant[],
  } as never)) as MedplumAppointmentResource;
}

export async function listPatientAppointments(patientId: string, count = 40): Promise<AppointmentSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('Appointment', {
    actor: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as MedplumAppointmentResource[];

  return resources
    .map(mapAppointmentSummary)
    .filter((appointment): appointment is AppointmentSummary => !!appointment);
}
