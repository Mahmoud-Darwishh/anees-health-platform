'use server';

import { AuditAction } from '@prisma/client';
import { createPatientDocument, deletePatientDocument } from '@/lib/medplum/documents';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from '@/lib/utils/audit';
import { requestDocumentDeleteApprovalSchema, createDocumentSchema, deleteDocumentSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { setAdminPatientFlash } from '../flash';
import { MAX_DOCUMENT_UPLOAD_BYTES, DOCUMENT_DELETE_APPROVAL_TTL_MINUTES, refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner } from './shared';

export async function createDocumentAction(formData: FormData): Promise<void> {
  try {
    const { practitioner, changedBy } = await getClinicalWriterWithPractitioner();
    const input = createDocumentSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('document.create', input.medplumPatientId, 'documents');
    const file = formData.get('documentFile');

    if (!(file instanceof File) || file.size <= 0) {
      throw new Error('Document file is required.');
    }

    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new Error('Document is too large. Maximum allowed size is 25 MB.');
    }

    const uploaded = await createPatientDocument({
      patientId: input.medplumPatientId,
      title: input.documentTitle,
      originalFilename: file.name || input.documentTitle,
      contentType: file.type || 'application/octet-stream',
      data: Buffer.from(await file.arrayBuffer()),
      category: input.documentCategory,
      note: input.documentNote ?? null,
      authorReference: practitioner.reference,
      authorDisplay: practitioner.display,
      documentDate: input.documentDate ?? null,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumDocumentReference',
      recordId: uploaded.id,
      action: AuditAction.create,
      changedFields: ['status', 'subject', 'type', 'category', 'content', 'author'],
      changedBy,
    });

    await setAdminPatientFlash({
      type: 'success',
      message: 'Document uploaded successfully.',
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function requestDocumentDeleteApprovalAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getClinicalWriterWithPractitioner();
    const input = requestDocumentDeleteApprovalSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('document.delete', input.medplumPatientId, 'documents');

    const expiresAt = new Date(Date.now() + DOCUMENT_DELETE_APPROVAL_TTL_MINUTES * 60 * 1000);
    const token = await prisma.destructiveApprovalToken.create({
      data: {
        medplumPatientId: input.medplumPatientId,
        actionType: 'document_delete',
        targetRecordId: input.documentId,
        payload: {
          reason: input.deleteApprovalReason,
          role: staff.staffRole,
        },
        requestedBy: changedBy,
        expiresAt,
        status: 'pending',
      },
    });

    await writeAuditLog({
      tableName: 'destructive_approval_tokens',
      recordId: token.id,
      action: 'override',
      changedBy,
      changedFields: {
        actionType: 'document_delete',
        targetRecordId: input.documentId,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
      },
    });

    await setAdminPatientFlash({ type: 'success', message: 'Document delete approval requested.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = deleteDocumentSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('document.delete', input.medplumPatientId, 'documents');

    const approval = await prisma.destructiveApprovalToken.findFirst({
      where: {
        medplumPatientId: input.medplumPatientId,
        actionType: 'document_delete',
        targetRecordId: input.documentId,
        status: 'consumed',
        consumedBy: changedBy,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });

    if (!approval) {
      throw new Error('Document delete requires an approved, unexpired destructive approval token.');
    }

    const deleted = await deletePatientDocument(input.documentId);

    await writeMedplumAuditMirror({
      tableName: 'MedplumDocumentReference',
      recordId: deleted.documentId,
      action: AuditAction.delete,
      changedFields: ['status', 'content.attachment.url'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Document deleted successfully.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

