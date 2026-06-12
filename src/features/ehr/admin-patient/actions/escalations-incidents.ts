'use server';

import { AuditAction } from '@prisma/client';
import { createPatientTask } from '@/lib/medplum/tasks';
import { createPatientCommunication } from '@/lib/medplum/communications';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { createIncidentReportSchema, createEscalationSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, getPatientIdFromFormData, failAction, requireAdminPatientAction, getCoordinationWriterWithPractitioner, resolvePractitionerFromStaffId, createEscalationAndCommunication, runEscalationSlaSweepForPatient, runCoSignSlaSweepForPatient } from './shared';

export async function createIncidentReportAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createIncidentReportSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('incident_report.create', input.medplumPatientId, 'incident_reports');

    const message = [
      `Incident type: ${input.incidentType}`,
      `Summary: ${input.incidentSummary}`,
      input.incidentActionsTaken ? `Actions taken: ${input.incidentActionsTaken}` : null,
    ]
      .filter((line): line is string => !!line)
      .join('\n');

    const communication = await createPatientCommunication({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      category: 'incident',
      priority: input.incidentSeverity,
      message,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCommunication',
      recordId: communication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'category', 'subject', 'sender', 'payload'],
      changedBy,
    });

    if (input.incidentEscalationNeeded === true) {
      const escalation = await createEscalationAndCommunication({
        patientId: input.medplumPatientId,
        encounterId: input.encounterId ?? null,
        title: `Incident escalation: ${input.incidentType}`,
        summary: `${input.incidentSummary}${
          input.incidentActionsTaken ? `\nActions taken: ${input.incidentActionsTaken}` : ''
        }`,
        priority: input.incidentSeverity,
        senderReference: practitioner.reference,
        senderDisplay: practitioner.display,
      });

      await writeMedplumAuditMirror({
        tableName: 'MedplumEscalationTask',
        recordId: escalation.taskId ?? `${input.medplumPatientId}:${Date.now()}`,
        action: AuditAction.create,
        changedFields: ['status', 'priority', 'code', 'description', 'for', 'encounter'],
        changedBy,
      });
    }

    await setAdminPatientFlash({ type: 'success', message: 'Incident report logged successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createEscalationAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createEscalationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('escalation.update', input.medplumPatientId, 'escalations');

    const owner = await resolvePractitionerFromStaffId(input.escalationOwnerStaffId ?? null);

    const escalationTask = await createPatientTask({
      patientId: input.medplumPatientId,
      encounterId: input.escalationEncounterId ?? null,
      ownerReference: owner?.practitioner.reference ?? null,
      ownerDisplay: owner?.staff.name ?? null,
      title: input.escalationTitle,
      description: input.escalationSummary,
      dueDate: input.escalationDueDate ?? null,
      priority: input.escalationPriority,
      taskCode: 'escalation',
    });

    const communication = await createPatientCommunication({
      patientId: input.medplumPatientId,
      encounterId: input.escalationEncounterId ?? null,
      category: 'escalation',
      priority: input.escalationPriority,
      message: input.escalationSummary,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
      recipientReference: owner?.practitioner.reference ?? null,
      recipientDisplay: owner?.staff.name ?? null,
      basedOnTaskId: escalationTask.id ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumEscalationTask',
      recordId: escalationTask.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'code', 'description', 'for', 'owner', 'executionPeriod'],
      changedBy,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCommunication',
      recordId: communication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'category', 'subject', 'sender', 'recipient', 'payload', 'basedOn'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Escalation created and routed successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function runEscalationSlaSweepAction(formData: FormData): Promise<void> {
  try {
    const { practitioner } = await getCoordinationWriterWithPractitioner();
    const medplumPatientId = getPatientIdFromFormData(formData);
    if (!medplumPatientId) {
      throw new Error('Patient id is required.');
    }
    await requireAdminPatientAction('escalation.update', medplumPatientId, 'escalations');

    const sender = {
      reference: practitioner.reference,
      display: practitioner.display,
    };

    const escalationBreachedCount = await runEscalationSlaSweepForPatient(medplumPatientId, sender);
    const coSignBreachedCount = await runCoSignSlaSweepForPatient(medplumPatientId, sender);
    const totalBreachedCount = escalationBreachedCount + coSignBreachedCount;

    await setAdminPatientFlash({
      type: 'success',
      message:
        totalBreachedCount > 0
          ? `SLA sweep completed. Escalation breaches: ${escalationBreachedCount}. Co-sign breaches: ${coSignBreachedCount}.`
          : 'SLA sweep completed. No breached escalation or co-sign tasks were found.',
    });
    refreshClinicalPaths(medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

