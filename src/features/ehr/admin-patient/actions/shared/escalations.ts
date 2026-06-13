import 'server-only';

import { createPatientTask, listPatientTasks } from '@/lib/medplum/tasks';
import { createPatientCommunication, listPatientCommunications } from '@/lib/medplum/communications';
import { ESCALATION_SLA_ACK_MINUTES } from '@/lib/config/nursing-ops-policy';
import { COSIGN_SLA_BREACH_MARKER } from './constants';

export async function createEscalationAndCommunication(params: {
  patientId: string;
  encounterId?: string | null;
  title: string;
  summary: string;
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  senderReference: string;
  senderDisplay: string;
  recipientReference?: string | null;
  recipientDisplay?: string | null;
  dueDate?: Date | null;
}): Promise<{ taskId: string | null; communicationId: string | null }> {
  const escalationTask = await createPatientTask({
    patientId: params.patientId,
    encounterId: params.encounterId ?? null,
    ownerReference: params.recipientReference ?? null,
    ownerDisplay: params.recipientDisplay ?? null,
    title: params.title,
    description: params.summary,
    dueDate: params.dueDate ?? null,
    priority: params.priority,
    taskCode: 'escalation',
  });

  const communication = await createPatientCommunication({
    patientId: params.patientId,
    encounterId: params.encounterId ?? null,
    category: 'escalation',
    priority: params.priority,
    message: params.summary,
    senderReference: params.senderReference,
    senderDisplay: params.senderDisplay,
    recipientReference: params.recipientReference ?? null,
    recipientDisplay: params.recipientDisplay ?? null,
    basedOnTaskId: escalationTask.id ?? null,
  });

  return {
    taskId: escalationTask.id ?? null,
    communicationId: communication.id ?? null,
  };
}

export async function hasRecentOpenVitalsAutoEscalation(medplumPatientId: string): Promise<boolean> {
  const tasks = await listPatientTasks(medplumPatientId, 100);
  const now = Date.now();

  return tasks.some((task) => {
    const isEscalation = task.code?.coding?.[0]?.code === 'escalation';
    const isOpen = !['completed', 'cancelled'].includes(task.status);
    const isVitalsAlert = (task.code?.text ?? '').toLowerCase().includes('vitals')
      || (task.description ?? '').toLowerCase().includes('vitals threshold');
    const authoredAt = task.authoredOn ? new Date(task.authoredOn).getTime() : NaN;
    const isRecent = Number.isFinite(authoredAt) && now - authoredAt <= 6 * 60 * 60 * 1000;

    return isEscalation && isOpen && isVitalsAlert && isRecent;
  });
}

export async function runEscalationSlaSweepForPatient(
  medplumPatientId: string,
  sender: { reference: string; display: string },
): Promise<number> {
  const tasks = await listPatientTasks(medplumPatientId, 120);
  const nowMs = Date.now();
  const thresholdMs = ESCALATION_SLA_ACK_MINUTES * 60 * 1000;

  let breachedCount = 0;

  for (const task of tasks) {
    if (task.code?.coding?.[0]?.code !== 'escalation') {
      continue;
    }

    if (!['requested', 'received', 'ready'].includes(task.status)) {
      continue;
    }

    const authoredMs = task.authoredOn ? new Date(task.authoredOn).getTime() : NaN;
    if (!Number.isFinite(authoredMs) || nowMs - authoredMs < thresholdMs) {
      continue;
    }

    const summary = `Escalation SLA breach: task ${task.id ?? 'unknown'} has not been acknowledged within ${ESCALATION_SLA_ACK_MINUTES} minutes.`;

    await createPatientCommunication({
      patientId: medplumPatientId,
      category: 'escalation',
      priority: 'stat',
      message: summary,
      senderReference: sender.reference,
      senderDisplay: sender.display,
      recipientReference: task.owner?.reference ?? null,
      recipientDisplay: task.owner?.display ?? null,
      basedOnTaskId: task.id ?? null,
    });

    breachedCount += 1;
  }

  return breachedCount;
}

export async function runCoSignSlaSweepForPatient(
  medplumPatientId: string,
  sender: { reference: string; display: string },
): Promise<number> {
  const tasks = await listPatientTasks(medplumPatientId, 200);
  const communications = await listPatientCommunications(medplumPatientId, 200);
  const nowMs = Date.now();

  let breachedCount = 0;

  for (const task of tasks) {
    if (task.code?.coding?.[0]?.code !== 'co-sign') {
      continue;
    }

    if (['completed', 'cancelled'].includes(task.status)) {
      continue;
    }

    const dueMs = task.executionPeriod?.end ? new Date(task.executionPeriod.end).getTime() : NaN;
    if (!Number.isFinite(dueMs) || dueMs > nowMs) {
      continue;
    }

    const alreadyRaised = communications.some(
      (item) =>
        item.category === 'escalation' &&
        item.basedOnTaskId === (task.id ?? null) &&
        item.message.includes(COSIGN_SLA_BREACH_MARKER),
    );

    if (alreadyRaised) {
      continue;
    }

    const summary = `${COSIGN_SLA_BREACH_MARKER} Co-sign SLA breach: task ${task.id ?? 'unknown'} passed the 24-hour deadline without completion.`;

    await createPatientCommunication({
      patientId: medplumPatientId,
      category: 'escalation',
      priority: 'stat',
      message: summary,
      senderReference: sender.reference,
      senderDisplay: sender.display,
      recipientReference: task.owner?.reference ?? null,
      recipientDisplay: task.owner?.display ?? null,
      basedOnTaskId: task.id ?? null,
    });

    breachedCount += 1;
  }

  return breachedCount;
}
