'use server';

import { AuditAction } from '@prisma/client';
import { createPatientLabOrder, createPatientDiagnosticReport, createLabResultObservation, attachResultToDiagnosticReport } from '@/lib/medplum/labs';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { assertMedplumTerminologyValue, extractPreferredCode } from '@/lib/medplum/terminology';
import { resolveLabAnalyte, interpretLabValue } from '@/features/ehr/catalogs/lab-analytes';
import { createLabOrderSchema, createDiagnosticReportSchema, addLabResultSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, createPatientReviewTask } from './shared';

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

    // Order → result loop: every order spawns a follow-up review Task owned by the
    // ordering clinician, so an unresulted order can't silently fall through.
    await createPatientReviewTask({
      medplumPatientId: input.medplumPatientId,
      taskCode: 'lab-result-review',
      marker: `[lab-result-review]:${order.id ?? input.medplumPatientId}`,
      title: `Review result for lab order: ${validatedLabOrder.label}`,
      description: `Follow up and file the result for "${validatedLabOrder.label}".`,
      changedBy,
      ownerReference: practitioner.reference,
      ownerDisplay: practitioner.display,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Lab order saved — a result-review task was created.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function addLabResultAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = addLabResultSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('lab.interpret', input.medplumPatientId, 'diagnostic_reports');

    const analyte = resolveLabAnalyte({ label: input.analyteLabel, key: input.analyteKey ?? null });
    if (!analyte) {
      throw new Error('Pick a coded analyte from the suggestions — free-text lab values are not stored discretely.');
    }

    const flag = interpretLabValue(analyte, input.labResultValue);
    const observation = await createLabResultObservation({
      patientId: input.medplumPatientId,
      analyteLabel: analyte.label,
      loinc: analyte.loinc,
      value: input.labResultValue,
      unit: analyte.unit,
      referenceLow: analyte.low ?? null,
      referenceHigh: analyte.high ?? null,
      flag,
      basedOnOrderId: input.basedOnOrderId ?? null,
      effectiveDate: input.labResultEffectiveOn ?? null,
      performerReference: practitioner.reference,
      performerDisplay: practitioner.display,
    });

    if (input.diagnosticReportId && observation.id) {
      await attachResultToDiagnosticReport(input.diagnosticReportId, observation.id);
    }

    await writeMedplumAuditMirror({
      tableName: 'MedplumObservation',
      recordId: observation.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'category', 'code', 'valueQuantity', 'interpretation', 'referenceRange', 'basedOn'],
      changedBy,
      patientId: input.medplumPatientId,
    });

    const flagWord = flag === 'N' ? 'normal' : flag === 'H' ? 'HIGH' : 'LOW';
    await setAdminPatientFlash({
      type: 'success',
      message: `Result saved — ${analyte.label} ${input.labResultValue} ${analyte.unit} (${flagWord}).`,
    });
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

