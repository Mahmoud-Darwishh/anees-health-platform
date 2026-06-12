'use server';

import { prisma } from '@/lib/db/prisma';
import { createStandingOrderSchema, executeStandingOrderSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getCoordinationWriterWithPractitioner, getWorkflowVisitOrThrow } from './shared';

export async function createStandingOrderAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = createStandingOrderSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('standing_order.create', input.medplumPatientId, 'standing_orders');

    if (!['doctor', 'admin', 'superadmin', 'medical_ops', 'operator'].includes(staff.staffRole ?? 'viewer')) {
      throw new Error('Only doctor/admin/medical-ops roles can create standing orders.');
    }

    const localPatient = await prisma.patient.findUnique({
      where: { medplumPatientId: input.medplumPatientId },
      select: { id: true },
    });

    if (!localPatient?.id) {
      throw new Error('Local patient profile is missing.');
    }

    await prisma.standingOrder.create({
      data: {
        patientId: localPatient.id,
        discipline: input.standingOrderDiscipline,
        title: input.standingOrderTitle,
        instructions: input.standingOrderInstructions,
        validUntil: input.standingOrderValidUntil ?? null,
        createdByStaffId: changedBy,
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName: 'standing_order',
        recordId: localPatient.id,
        action: 'create',
        changedFields: {
          discipline: input.standingOrderDiscipline,
          title: input.standingOrderTitle,
          validUntil: input.standingOrderValidUntil?.toISOString() ?? null,
        },
        changedBy,
      },
    });

    await setAdminPatientFlash({ type: 'success', message: 'Standing order created.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function executeStandingOrderAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = executeStandingOrderSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('standing_order.execute', input.medplumPatientId, 'standing_orders');

    if (!['doctor', 'nurse', 'physiotherapist', 'medical_ops', 'operator', 'admin', 'superadmin'].includes(staff.staffRole ?? 'viewer')) {
      throw new Error('Your role cannot execute standing orders.');
    }

    const [standingOrder, visit] = await Promise.all([
      prisma.standingOrder.findFirst({
        where: {
          id: input.standingOrderId,
          patient: {
            medplumPatientId: input.medplumPatientId,
          },
          isActive: true,
        },
        select: {
          id: true,
          validUntil: true,
        },
      }),
      getWorkflowVisitOrThrow({
        visitId: input.executionVisitId,
        medplumPatientId: input.medplumPatientId,
      }),
    ]);

    if (!standingOrder?.id) {
      throw new Error('Standing order not found or inactive.');
    }

    if (standingOrder.validUntil && standingOrder.validUntil.getTime() < input.executionRecordedAt.getTime()) {
      throw new Error('Standing order is expired and cannot be executed.');
    }

    if (!visit.checkInAt || visit.checkOutAt) {
      throw new Error('Standing orders can only be executed during an active checked-in visit.');
    }

    await prisma.standingOrderExecution.create({
      data: {
        standingOrderId: standingOrder.id,
        visitId: visit.id,
        executedByStaffId: changedBy,
        executedAt: input.executionRecordedAt,
        executionNote: input.executionNote ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName: 'standing_order_execution',
        recordId: standingOrder.id,
        action: 'create',
        changedFields: {
          visitId: visit.id,
          executedAt: input.executionRecordedAt.toISOString(),
        },
        changedBy,
      },
    });

    await setAdminPatientFlash({ type: 'success', message: 'Standing order execution recorded.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

