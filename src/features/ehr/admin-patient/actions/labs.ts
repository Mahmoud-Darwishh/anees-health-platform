'use server';

import { AuditAction } from '@prisma/client';
import { createPatientLabOrder, createPatientDiagnosticReport } from '@/lib/medplum/labs';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { assertMedplumTerminologyValue, extractPreferredCode } from '@/lib/medplum/terminology';
import { createLabOrderSchema, createDiagnosticReportSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner } from './shared';

export async function createLabOrderAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createLabOrderSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('lab.order', input.medplumPatientId, 'lab_orders');

    const validatedLabOrder = await assertMedplumTerminologyValue('lab-order', input.labOrderTitle);
    const labCode = extractPreferredCode(validatedLabOrder, ['loinc', 'code', 'local']);

    const order = await createPatientLabOrder({
      patientId: input.medplumPatientId,
      title: validatedLabOrder.label,
      category: input.labOrderCategory,
      code: labCode ?? input.labOrderCode ?? null,
      note: input.labOrderNote ?? null,
      requestedOn: input.labOrderDate ?? null,
      requestedByReference: practitioner.reference,
      requestedByDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumServiceRequest',
      recordId: order.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'intent', 'category', 'code', 'subject', 'authoredOn', 'requester'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Lab order saved successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function createDiagnosticReportAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createDiagnosticReportSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('lab.interpret', input.medplumPatientId, 'diagnostic_reports');

    const validatedDiagnostic = await assertMedplumTerminologyValue('diagnostic-report', input.diagnosticTitle);

    const report = await createPatientDiagnosticReport({
      patientId: input.medplumPatientId,
      title: validatedDiagnostic.label,
      category: input.diagnosticCategory,
      status: input.diagnosticStatus,
      conclusion: input.diagnosticConclusion ?? null,
      note: input.diagnosticNote ?? null,
      effectiveDate: input.diagnosticEffectiveOn ?? null,
      issuedDate: input.diagnosticIssuedOn ?? null,
      linkedOrderId: input.linkedLabOrderId ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumDiagnosticReport',
      recordId: report.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'category', 'code', 'subject', 'effectiveDateTime', 'issued', 'basedOn', 'performer', 'conclusion'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Diagnostic report saved successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

