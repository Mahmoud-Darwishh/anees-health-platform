import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

export type MedplumTaskResource = {
  resourceType: 'Task';
  id?: string;
  meta?: {
    versionId?: string;
  };
  status:
    | 'draft'
    | 'requested'
    | 'received'
    | 'accepted'
    | 'rejected'
    | 'ready'
    | 'cancelled'
    | 'in-progress'
    | 'on-hold'
    | 'failed'
    | 'completed'
    | 'entered-in-error';
  intent?: 'unknown' | 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  code?: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  };
  description?: string;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  for?: FhirReference;
  encounter?: FhirReference;
  owner?: FhirReference;
  authoredOn?: string;
  executionPeriod?: {
    start?: string;
    end?: string;
  };
};

export type CreatePatientTaskInput = {
  patientId: string;
  encounterId?: string | null;
  ownerReference?: string | null;
  ownerDisplay?: string | null;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat' | null;
  taskCode?: string | null;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
};

export async function createPatientTask(input: CreatePatientTaskInput): Promise<MedplumTaskResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: input.priority ?? undefined,
    code: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.taskType,
          code: input.taskCode ?? 'follow-up',
          display: input.title,
        },
      ],
      text: input.title,
    },
    description: input.description ?? undefined,
    for: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    owner: input.ownerReference
      ? { reference: input.ownerReference, display: input.ownerDisplay ?? undefined }
      : undefined,
    authoredOn: new Date().toISOString(),
    executionPeriod: input.dueDate ? { end: input.dueDate.toISOString() } : undefined,
  } as never)) as MedplumTaskResource;
}

export async function listPatientTasks(patientId: string, count = 50): Promise<MedplumTaskResource[]> {
  const medplum = await getMedplumClient();

  return (await medplum.searchResources('Task', {
    for: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as MedplumTaskResource[];
}

export async function updatePatientTaskStatus(
  taskId: string,
  status: 'requested' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled',
  options?: { expectedVersionId?: string | null },
): Promise<MedplumTaskResource> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.readResource('Task', taskId)) as MedplumTaskResource;

  if (options?.expectedVersionId && existing.meta?.versionId !== options.expectedVersionId) {
    throw new Error('Task was updated by another user. Please refresh and try again.');
  }

  return (await medplum.updateResource({
    ...existing,
    status,
  } as never, {
    headers: options?.expectedVersionId
      ? { 'If-Match': `W/\"${options.expectedVersionId}\"` }
      : undefined,
  })) as MedplumTaskResource;
}
