'use server';

import { AuditAction } from '@prisma/client';
import { createPatientCommunication } from '@/lib/medplum/communications';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { NURSING_SHIFT_ACK_WINDOW_MINUTES } from '@/lib/config/nursing-ops-policy';
import { prisma } from '@/lib/db/prisma';
import { createNurseShiftAssignmentSchema, acknowledgeIncomingNurseSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { NURSING_SHIFT_WRITE_ROLES, refreshClinicalPaths, failAction, requireAdminPatientAction, getCoordinationWriterWithPractitioner, createEscalationAndCommunication } from './shared';

export async function createNurseShiftAssignmentAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    if (!NURSING_SHIFT_WRITE_ROLES.includes(staff.staffRole ?? 'viewer')) {
      throw new Error('Only nurse/admin roles can manage shift roster assignments.');
    }

    const input = createNurseShiftAssignmentSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('nursing_shift.manage', input.medplumPatientId, 'nurse_shift_assignments');
    const localPatient = await prisma.patient.findUnique({
      where: { medplumPatientId: input.medplumPatientId },
      select: { id: true },
    });

    if (!localPatient?.id) {
      throw new Error('Local patient record is missing. Sync patient record before assigning shifts.');
    }

    const nurse = await prisma.staff.findUnique({
      where: { id: input.primaryNurseStaffId },
      select: { id: true, role: true, status: true, name: true },
    });

    if (!nurse || nurse.status !== 'active' || nurse.role !== 'nurse') {
      throw new Error('Primary assignment must target an active nurse.');
    }

    const overlap = await prisma.nurseShiftAssignment.findFirst({
      where: {
        patientId: localPatient.id,
        status: {
          in: ['scheduled', 'in_progress'],
        },
        shiftStartAt: {
          lt: input.shiftEndAt,
        },
        shiftEndAt: {
          gt: input.shiftStartAt,
        },
      },
      select: { id: true },
    });

    if (overlap) {
      throw new Error('Shift overlaps an existing active assignment for this patient.');
    }

    const assignment = await prisma.nurseShiftAssignment.create({
      data: {
        patientId: localPatient.id,
        primaryNurseStaffId: nurse.id,
        shiftStartAt: input.shiftStartAt,
        shiftEndAt: input.shiftEndAt,
        status: 'scheduled',
        notes: input.shiftNotes ?? null,
        createdByStaffId: staff.staffId,
      },
      select: { id: true },
    });

    await writeMedplumAuditMirror({
      tableName: 'NurseShiftAssignment',
      recordId: assignment.id,
      action: AuditAction.create,
      changedFields: ['patientId', 'primaryNurseStaffId', 'shiftStartAt', 'shiftEndAt', 'status', 'notes'],
      changedBy,
    });

    await createPatientCommunication({
      patientId: input.medplumPatientId,
      category: 'handoff',
      priority: 'routine',
      message: `Shift roster updated: ${nurse.name} assigned from ${input.shiftStartAt.toISOString()} to ${input.shiftEndAt.toISOString()}.`,
      senderReference: practitioner.reference,
      senderDisplay: practitioner.display,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Shift assignment added.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function acknowledgeIncomingNurseAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = acknowledgeIncomingNurseSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('nursing_shift.manage', input.medplumPatientId, 'nurse_shift_assignments');

    const assignment = await prisma.nurseShiftAssignment.findUnique({
      where: { id: input.assignmentId },
      include: {
        patient: {
          select: {
            medplumPatientId: true,
          },
        },
        primaryNurse: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!assignment || assignment.patient.medplumPatientId !== input.medplumPatientId) {
      throw new Error('Shift assignment not found for this patient.');
    }

    const fallbackStaffId = staff.staffId;
    if (!fallbackStaffId) {
      throw new Error('Incoming nurse account is missing.');
    }
    const incomingNurseId = input.incomingNurseStaffId ?? fallbackStaffId;
    const incomingNurse = await prisma.staff.findUnique({
      where: { id: incomingNurseId },
      select: { id: true, role: true, status: true, name: true },
    });

    if (!incomingNurse || incomingNurse.status !== 'active' || incomingNurse.role !== 'nurse') {
      throw new Error('Incoming acknowledgement must be completed by an active nurse account.');
    }

    await prisma.nurseShiftAssignment.update({
      where: { id: assignment.id },
      data: {
        incomingNurseStaffId: incomingNurse.id,
        acknowledgedAt: input.acknowledgedAt,
        notes: input.acknowledgementNote ?? assignment.notes,
        status: input.acknowledgedAt >= assignment.shiftStartAt ? 'in_progress' : assignment.status,
      },
    });

    const minutesLate = Math.floor(
      (input.acknowledgedAt.getTime() - assignment.shiftStartAt.getTime()) / (60 * 1000),
    );

    if (minutesLate > NURSING_SHIFT_ACK_WINDOW_MINUTES) {
      const escalation = await createEscalationAndCommunication({
        patientId: input.medplumPatientId,
        title: 'Shift acknowledgment delayed',
        summary: `Incoming nurse acknowledgment happened after ${minutesLate} minutes. Allowed window is ${NURSING_SHIFT_ACK_WINDOW_MINUTES} minutes.`,
        priority: 'urgent',
        senderReference: practitioner.reference,
        senderDisplay: practitioner.display,
      });

      await prisma.nurseShiftAssignment.update({
        where: { id: assignment.id },
        data: {
          escalationTaskId: escalation.taskId,
        },
      });

      await writeMedplumAuditMirror({
        tableName: 'MedplumEscalationTask',
        recordId: escalation.taskId ?? `${input.medplumPatientId}:${Date.now()}`,
        action: AuditAction.create,
        changedFields: ['status', 'priority', 'code', 'description', 'for'],
        changedBy,
      });
    }

    await writeMedplumAuditMirror({
      tableName: 'NurseShiftAssignment',
      recordId: assignment.id,
      action: AuditAction.update,
      changedFields: ['incomingNurseStaffId', 'acknowledgedAt', 'status', 'notes', 'escalationTaskId'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Incoming nurse acknowledgment saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

