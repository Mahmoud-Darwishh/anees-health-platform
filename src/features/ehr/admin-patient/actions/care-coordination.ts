'use server';

import { AuditAction } from '@prisma/client';
import { ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { assignStaffToPatientCareTeam, unassignStaffFromPatientCareTeam } from '@/lib/medplum/care-teams';
import { createPatientTask, updatePatientTaskStatus } from '@/lib/medplum/tasks';
import { createPatientCommunication } from '@/lib/medplum/communications';
import { createPatientAppointment } from '@/lib/medplum/appointments';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { prisma } from '@/lib/db/prisma';
import { assignCareTeamSchema, createCareTaskSchema, createCommunicationSchema, createAppointmentSchema, formDataToInput, unassignCareTeamSchema, updateCareTaskStatusSchema } from '@/features/ehr/schemas/admin-patient-actions';
import { toCareTeamRole } from '../helpers';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, getCoordinationWriterWithPractitioner, resolvePractitionerFromStaffId } from './shared';

export async function assignCareTeamMemberAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = assignCareTeamSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('care_team.assign', input.medplumPatientId, 'care_team');

    const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
    if (!staff || staff.status !== 'active') {
      throw new Error('Selected staff member is not active.');
    }

    const roleCode = toCareTeamRole(staff.role);
    if (!roleCode) {
      throw new Error('This staff role cannot be assigned to clinical care teams.');
    }

    const practitioner = await ensureMedplumPractitionerForStaff({
      staffId: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
    });

    const careTeam = await assignStaffToPatientCareTeam(
      input.medplumPatientId,
      {
        practitionerReference: practitioner.reference,
        display: staff.name,
        roleCode,
      },
      {
        expectedVersionId: input.careTeamVersionId ?? null,
      },
    );

    await writeMedplumAuditMirror({
      tableName: 'MedplumCareTeam',
      recordId: careTeam.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.update,
      changedFields: ['participant'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Care team member assigned.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function unassignCareTeamMemberAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = unassignCareTeamSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('care_team.assign', input.medplumPatientId, 'care_team');

    const careTeam = await unassignStaffFromPatientCareTeam(input.medplumPatientId, input.practitionerReference, {
      expectedVersionId: input.careTeamVersionId ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCareTeam',
      recordId: careTeam?.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.update,
      changedFields: ['participant'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Care team member unassigned.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createCareTaskAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = createCareTaskSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('task.create', input.medplumPatientId, 'tasks');

    const task = await createPatientTask({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      title: input.taskTitle,
      description: input.taskDescription ?? '',
      dueDate: input.taskDueDate,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumTask',
      recordId: task.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'code', 'description', 'for', 'executionPeriod'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Task created successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updateCareTaskStatusAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = updateCareTaskStatusSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('task.update', input.medplumPatientId, 'tasks');

    const task = await updatePatientTaskStatus(input.taskId, input.nextStatus, {
      expectedVersionId: input.taskVersionId ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumTask',
      recordId: task.id ?? input.taskId,
      action: AuditAction.update,
      changedFields: ['status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Task status updated.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createCommunicationAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createCommunicationSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('communication.create', input.medplumPatientId, 'communications');

    const recipient = await resolvePractitionerFromStaffId(input.communicationRecipientStaffId ?? null);

    const communication = await createPatientCommunication({
      patientId: input.medplumPatientId,
      encounterId: input.communicationEncounterId ?? null,
      category: input.communicationCategory,
      priority: input.communicationPriority,
      message: input.communicationMessage,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
      recipientReference: recipient?.practitioner.reference ?? null,
      recipientDisplay: recipient?.staff.name ?? null,
      basedOnTaskId: input.linkedTaskId ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumCommunication',
      recordId: communication.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'priority', 'category', 'subject', 'sender', 'recipient', 'payload', 'basedOn'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Communication sent successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createAppointmentAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createAppointmentSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('appointment.create', input.medplumPatientId, 'appointments');

    const owner = await resolvePractitionerFromStaffId(input.appointmentOwnerStaffId ?? null);

    const appointment = await createPatientAppointment({
      patientId: input.medplumPatientId,
      startAt: input.appointmentStart,
      endAt: input.appointmentEnd,
      visitType: input.appointmentType,
      note: input.appointmentNote ?? null,
      practitionerReference: owner?.practitioner.reference ?? null,
      practitionerDisplay: owner?.staff.name ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumAppointment',
      recordId: appointment.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'serviceType', 'participant', 'start', 'end', 'description'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Appointment scheduled successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

