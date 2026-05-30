import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

export type MedplumCommunicationResource = {
  resourceType: 'Communication';
  id?: string;
  meta?: {
    versionId?: string;
  };
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  category?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  subject?: FhirReference;
  encounter?: FhirReference;
  sent?: string;
  sender?: FhirReference;
  recipient?: FhirReference[];
  basedOn?: FhirReference[];
  payload?: Array<{ contentString?: string }>;
};

export type CommunicationSummary = {
  id: string;
  category: 'clinical-update' | 'handoff' | 'escalation' | 'other';
  status: string;
  priority: 'routine' | 'urgent' | 'asap' | 'stat' | null;
  sentAt: string | null;
  sender: string | null;
  recipient: string | null;
  message: string;
  basedOnTaskId: string | null;
};

type CreatePatientCommunicationInput = {
  patientId: string;
  encounterId?: string | null;
  category: 'clinical-update' | 'handoff' | 'escalation';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat' | null;
  message: string;
  senderReference: string;
  senderDisplay?: string | null;
  recipientReference?: string | null;
  recipientDisplay?: string | null;
  basedOnTaskId?: string | null;
};

function toCategoryLabel(category: CreatePatientCommunicationInput['category']): string {
  switch (category) {
    case 'clinical-update':
      return 'Clinical Update';
    case 'handoff':
      return 'Handoff';
    case 'escalation':
      return 'Escalation';
    default:
      return 'Clinical Update';
  }
}

function toCategoryCode(communication: MedplumCommunicationResource): CommunicationSummary['category'] {
  const code = communication.category?.[0]?.coding?.[0]?.code;
  if (code === 'clinical-update' || code === 'handoff' || code === 'escalation') {
    return code;
  }
  return 'other';
}

function mapCommunicationSummary(communication: MedplumCommunicationResource): CommunicationSummary | null {
  if (!communication.id) {
    return null;
  }

  return {
    id: communication.id,
    category: toCategoryCode(communication),
    status: communication.status,
    priority: communication.priority ?? null,
    sentAt: communication.sent ?? null,
    sender: communication.sender?.display ?? communication.sender?.reference ?? null,
    recipient: communication.recipient?.[0]?.display ?? communication.recipient?.[0]?.reference ?? null,
    message: communication.payload?.[0]?.contentString ?? '—',
    basedOnTaskId: communication.basedOn?.[0]?.reference?.startsWith('Task/')
      ? communication.basedOn[0].reference.slice('Task/'.length)
      : null,
  };
}

export async function createPatientCommunication(input: CreatePatientCommunicationInput): Promise<MedplumCommunicationResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    priority: input.priority ?? undefined,
    category: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.communicationType,
            code: input.category,
            display: toCategoryLabel(input.category),
          },
        ],
      },
    ],
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    sent: new Date().toISOString(),
    sender: {
      reference: input.senderReference,
      display: input.senderDisplay ?? undefined,
    },
    recipient: input.recipientReference
      ? [
          {
            reference: input.recipientReference,
            display: input.recipientDisplay ?? undefined,
          },
        ]
      : undefined,
    basedOn: input.basedOnTaskId ? [{ reference: `Task/${input.basedOnTaskId}` }] : undefined,
    payload: [{ contentString: input.message }],
  } as never)) as MedplumCommunicationResource;
}

export async function listPatientCommunications(patientId: string, count = 50): Promise<CommunicationSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('Communication', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as MedplumCommunicationResource[];

  return resources
    .map(mapCommunicationSummary)
    .filter((communication): communication is CommunicationSummary => !!communication);
}
