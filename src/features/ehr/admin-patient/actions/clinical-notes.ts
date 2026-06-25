'use server';

import { AuditAction } from '@prisma/client';
import { createClinicalNoteDraft, signClinicalNote } from '@/lib/medplum/clinical-notes';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { createNursingNoteSchema, createDoctorNoteSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import {
  refreshClinicalPaths,
  failAction,
  requireAdminPatientAction,
  getClinicalWriterWithPractitioner,
  assertRosteredNurseForPatientIfNurse,
} from './shared';

/**
 * Create and sign a narrative nursing note (FHIR `Composition`, discipline =
 * nursing) in one step — the field nurse signs on save. Gated on
 * `note.nursing.sign` (licence + nursing discipline + case-scope) and the same
 * roster check the rest of the nurse's clinical writes use. The note is created
 * as a draft then signed so it carries a legal `attester` + `Provenance`, exactly
 * like the chart-based note flow.
 */
export async function createNursingNoteAction(formData: FormData, opts?: { rethrow?: boolean }): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createNursingNoteSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('note.nursing.sign', input.medplumPatientId, 'nursing_notes');

    await assertRosteredNurseForPatientIfNurse(staff, input.medplumPatientId, new Date());

    const draft = await createClinicalNoteDraft({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      title: input.noteTitle ?? 'Nursing Note',
      noteBody: input.noteBody,
      discipline: 'nursing',
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
    });

    if (!draft.id) {
      throw new Error('Could not create the nursing note. Please try again.');
    }

    const signed = await signClinicalNote(
      draft.id,
      { authorReference: practitioner.reference, authorDisplay: practitioner.display },
      { expectedVersionId: draft.meta?.versionId ?? null },
    );

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: signed.id ?? draft.id,
      action: AuditAction.create,
      changedFields: ['status', 'type', 'subject', 'encounter', 'author', 'attester', 'section', 'extension'],
      changedBy,
      patientId: input.medplumPatientId,
      actorRole: staff.staffRole,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Nursing note signed.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error, opts);
  }
}

/**
 * Create and sign a narrative physician note (FHIR `Composition`, discipline =
 * medical) in one step — the doctor signs on save. Gated on `note.medical.sign`
 * (licence + medical discipline + case-scope), so only a licensed doctor (or an
 * admin) may author it; a nurse or physio is rejected by the matrix even though
 * they share the underlying note machinery. The note is created as a draft then
 * signed so it carries a legal `attester` + `Provenance`, identical to the
 * chart-based flow. This is what lets a visiting doctor document + sign inside the
 * field workspace instead of leaving for the full chart.
 */
export async function createDoctorNoteAction(formData: FormData, opts?: { rethrow?: boolean }): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createDoctorNoteSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('note.medical.sign', input.medplumPatientId, 'medical_notes');

    const draft = await createClinicalNoteDraft({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      title: input.noteTitle ?? 'Physician Note',
      noteBody: input.noteBody,
      discipline: 'medical',
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
    });

    if (!draft.id) {
      throw new Error('Could not create the physician note. Please try again.');
    }

    const signed = await signClinicalNote(
      draft.id,
      { authorReference: practitioner.reference, authorDisplay: practitioner.display },
      { expectedVersionId: draft.meta?.versionId ?? null },
    );

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: signed.id ?? draft.id,
      action: AuditAction.create,
      changedFields: ['status', 'type', 'subject', 'encounter', 'author', 'attester', 'section', 'extension'],
      changedBy,
      patientId: input.medplumPatientId,
      actorRole: staff.staffRole,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Physician note signed.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error, opts);
  }
}
