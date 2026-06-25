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
    lastUpdated?: string;
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

export type EscalationTaskSummary = {
  id: string;
  versionId: string | null;
  status: MedplumTaskResource['status'];
  priority: MedplumTaskResource['priority'] | null;
  title: string;
  description: string | null;
  patientReference: string | null;
  patientId: string | null;
  encounterId: string | null;
  ownerReference: string | null;
  ownerDisplay: string | null;
  dueAt: string | null;
  authoredOn: string | null;
  lastUpdated: string | null;
};

type ListEscalationTasksOptions = {
  count?: number;
  ownerReference?: string | null;
  statuses?: Array<MedplumTaskResource['status']>;
};

function extractReferenceId(reference?: string): string | null {
  if (!reference) {
    return null;
  }

  const parts = reference.split('/');
  const id = parts[parts.length - 1]?.trim();
  return id || null;
}

function taskCode(task: MedplumTaskResource): string | null {
  return task.code?.coding?.[0]?.code ?? null;
}

function mapEscalationTaskSummary(task: MedplumTaskResource): EscalationTaskSummary | null {
  if (!task.id) {
    return null;
  }

  return {
    id: task.id,
    versionId: task.meta?.versionId ?? null,
    status: task.status,
    priority: task.priority ?? null,
    title: task.code?.text ?? task.code?.coding?.[0]?.display ?? 'Escalation',
    description: task.description ?? null,
    patientReference: task.for?.reference ?? null,
    patientId: extractReferenceId(task.for?.reference),
    encounterId: extractReferenceId(task.encounter?.reference),
    ownerReference: task.owner?.reference ?? null,
    ownerDisplay: task.owner?.display ?? null,
    dueAt: task.executionPeriod?.end ?? null,
    authoredOn: task.authoredOn ?? null,
    lastUpdated: task.meta?.lastUpdated ?? null,
  };
}

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

/** Read a single Task by id. Returns null if it does not exist (never throws). */
export async function getPatientTaskById(taskId: string): Promise<MedplumTaskResource | null> {
  const medplum = await getMedplumClient();
  try {
    return (await medplum.readResource('Task', taskId)) as MedplumTaskResource;
  } catch {
    return null;
  }
}

export async function listTasksByOwner(ownerReference: string, count = 100): Promise<MedplumTaskResource[]> {
  const medplum = await getMedplumClient();

  return (await medplum.searchResources('Task', {
    owner: ownerReference,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as MedplumTaskResource[];
}

export async function listEscalationTasks(options: ListEscalationTasksOptions = {}): Promise<EscalationTaskSummary[]> {
  const medplum = await getMedplumClient();
  const resources = (await medplum.searchResources('Task', {
    code: 'escalation',
    _count: String(options.count ?? 200),
    _sort: '-_lastUpdated',
  })) as MedplumTaskResource[];

  const ownerReference = options.ownerReference?.trim();
  const statusFilter = options.statuses && options.statuses.length > 0 ? new Set(options.statuses) : null;

  return resources
    .filter((task) => taskCode(task) === 'escalation')
    .filter((task) => !ownerReference || task.owner?.reference === ownerReference)
    .filter((task) => !statusFilter || statusFilter.has(task.status))
    .map(mapEscalationTaskSummary)
    .filter((task): task is EscalationTaskSummary => !!task);
}

export async function updatePatientTaskStatus(
  taskId: string,
  status: 'requested' | 'accepted' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled',
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
