'use server';

import { AuditAction } from '@prisma/client';
import { createClinicalNoteDraft, signClinicalNote } from '@/lib/medplum/clinical-notes';
import { createPatientTask } from '@/lib/medplum/tasks';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { canSignClinical } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { createClinicalNoteSchema, amendClinicalNoteSchema, formDataToInput, signClinicalNoteSchema } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { NOTE_COSIGN_SLA_HOURS, refreshClinicalPaths, failAction, noteDraftActionForDiscipline, noteSignActionForDiscipline, requireAdminPatientAction, getClinicalWriterWithPractitioner, detectCoSignFlags, resolveDoctorOwnerReference, hasOpenCoSignTaskForNote } from './shared';

export async function createClinicalNoteDraftAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createClinicalNoteSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction(noteDraftActionForDiscipline(input.noteDiscipline), input.medplumPatientId, 'clinical_note');

    const isMedicalOpsCompat = staff.staffRole === 'medical_ops' || staff.staffRole === 'operator';
    if (!isMedicalOpsCompat && !canSignClinical(staff, input.noteDiscipline)) {
      throw new Error(`Your role cannot author ${input.noteDiscipline} clinical notes.`);
    }

    const draft = await createClinicalNoteDraft({
      patientId: input.medplumPatientId,
      encounterId: input.encounterId ?? null,
      title: input.noteTitle ?? '',
      noteBody: input.noteBody,
      discipline: input.noteDiscipline,
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: draft.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'title', 'section.text', 'subject', 'encounter', 'author'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Draft note saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function signClinicalNoteAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = signClinicalNoteSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction(noteSignActionForDiscipline(input.noteDiscipline), input.medplumPatientId, 'clinical_note');

    const staffLicense = await prisma.staff.findUnique({
      where: { id: staff.staffId ?? '' },
      select: {
        role: true,
        clinicalLicenseType: true,
        clinicalLicenseNumber: true,
        clinicalLicenseExpiry: true,
      },
    });

    if (!staffLicense) {
      throw new Error('Staff profile not found for note signing.');
    }

    if (
      !canSignClinical(
        {
          staffRole: staffLicense.role,
          clinicalLicenseType: staffLicense.clinicalLicenseType,
          clinicalLicenseNumber: staffLicense.clinicalLicenseNumber,
          clinicalLicenseExpiry: staffLicense.clinicalLicenseExpiry,
        },
        input.noteDiscipline,
      )
    ) {
      throw new Error(`Your role/license cannot sign ${input.noteDiscipline} clinical notes.`);
    }

    const signed = await signClinicalNote(
      input.compositionId,
      {
        authorReference: practitioner.reference,
        authorDisplay: practitioner.display,
      },
      {
        expectedVersionId: input.noteVersionId ?? null,
      },
    );

    const noteText =
      signed.extension?.find((entry) => entry.url === 'https://anees.health/fhir/StructureDefinition/clinical-note-text')
        ?.valueString ?? '';
    const coSignFlags = detectCoSignFlags(noteText);

    if (coSignFlags.length > 0 && (staff.staffRole === 'nurse' || staff.staffRole === 'physiotherapist' || staff.staffRole === 'medical_ops' || staff.staffRole === 'operator')) {
      const alreadyQueued = await hasOpenCoSignTaskForNote(input.medplumPatientId, input.compositionId);
      if (!alreadyQueued) {
        const doctorOwner = await resolveDoctorOwnerReference(input.medplumPatientId);
        const dueDate = new Date(Date.now() + NOTE_COSIGN_SLA_HOURS * 60 * 60 * 1000);
        const coSignTask = await createPatientTask({
          patientId: input.medplumPatientId,
          ownerReference: doctorOwner?.reference ?? null,
          ownerDisplay: doctorOwner?.display ?? null,
          taskCode: 'co-sign',
          priority: 'urgent',
          title: 'Clinical note co-sign required',
          description: `[note:${input.compositionId}] Flagged categories: ${coSignFlags.join(', ')}`,
          dueDate,
        });

        await writeMedplumAuditMirror({
          tableName: 'MedplumCoSignTask',
          recordId: coSignTask.id ?? `${input.medplumPatientId}:${Date.now()}`,
          action: AuditAction.create,
          changedFields: ['code', 'status', 'priority', 'description', 'for', 'owner', 'executionPeriod.end'],
          changedBy,
        });
      }
    }

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: input.compositionId,
      action: AuditAction.update,
      changedFields: ['status', 'date', 'author', 'extension.signedAt'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Note signed successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function amendClinicalNoteAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = amendClinicalNoteSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction(noteSignActionForDiscipline(input.noteDiscipline), input.medplumPatientId, 'clinical_note');

    const staffLicense = await prisma.staff.findUnique({
      where: { id: staff.staffId ?? '' },
      select: {
        role: true,
        clinicalLicenseType: true,
        clinicalLicenseNumber: true,
        clinicalLicenseExpiry: true,
      },
    });

    if (!staffLicense) {
      throw new Error('Staff profile not found for note amendment.');
    }

    if (
      !canSignClinical(
        {
          staffRole: staffLicense.role,
          clinicalLicenseType: staffLicense.clinicalLicenseType,
          clinicalLicenseNumber: staffLicense.clinicalLicenseNumber,
          clinicalLicenseExpiry: staffLicense.clinicalLicenseExpiry,
        },
        input.noteDiscipline,
      )
    ) {
      throw new Error(`Your role/license cannot amend ${input.noteDiscipline} clinical notes.`);
    }

    const amendment = await createClinicalNoteDraft({
      patientId: input.medplumPatientId,
      title: input.amendmentTitle ?? `Amendment for note ${input.sourceCompositionId}`,
      noteBody: input.amendmentBody,
      discipline: input.noteDiscipline,
      amendedFromCompositionId: input.sourceCompositionId,
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumClinicalNote',
      recordId: amendment.id ?? `${input.medplumPatientId}:${Date.now()}`,
      action: AuditAction.create,
      changedFields: ['status', 'date', 'author', 'extension.clinical-note-amends'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Note amendment draft created.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

