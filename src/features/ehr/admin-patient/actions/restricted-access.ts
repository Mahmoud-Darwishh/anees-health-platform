'use server';

import { createPatientCommunication } from '@/lib/medplum/communications';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { recordAudit } from '@/lib/utils/audit';
import { requestRestrictedAccessSchema, requestBreakGlassAccessSchema, approveDestructiveTokenSchema, formDataToInput } from '@/features/ehr/schemas/admin-patient-actions';
import { ADMIN_PATIENT_RESTRICTED_ACCESS_TTL_MINUTES } from '../constants';
import { setAdminPatientFlash } from '../flash';
import { RESTRICTED_OVERRIDE_WEEKLY_THRESHOLD, RESTRICTED_OVERRIDE_COMPLIANCE_MARKER, refreshClinicalPaths, failAction, requireAdminPatientAction, getCoordinationWriterWithPractitioner, createPatientReviewTask, resolveComplianceOwnerReference, resolveAdminOwnerReferences } from './shared';

export async function requestRestrictedAccessAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = requestRestrictedAccessSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('restricted.read', input.medplumPatientId, 'restricted_clinical_access');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ADMIN_PATIENT_RESTRICTED_ACCESS_TTL_MINUTES * 60 * 1000);
    const token = await prisma.destructiveApprovalToken.create({
      data: {
        medplumPatientId: input.medplumPatientId,
        actionType: 'restricted_read',
        targetRecordId: input.medplumPatientId,
        payload: {
          reason: input.restrictedAccessReason,
          role: staff.staffRole,
          accessType: 'reasoned_restricted_read',
        },
        requestedBy: changedBy,
        approvedBy: changedBy,
        approvedAt: now,
        consumedBy: changedBy,
        consumedAt: now,
        expiresAt,
        status: 'consumed',
      },
    });

    await recordAudit(
      {
        tableName: 'restricted_clinical_access',
        recordId: input.medplumPatientId,
        action: 'override',
        changedFields: {
          reason: input.restrictedAccessReason,
          role: staff.staffRole,
          tokenId: token.id,
          accessType: 'reasoned_restricted_read',
          expiresAt: expiresAt.toISOString(),
        },
        changedBy,
        patientId: input.medplumPatientId,
        actorRole: staff.staffRole,
      },
      { critical: true },
    );

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyOverrides = await prisma.auditLog.count({
      where: {
        tableName: 'restricted_clinical_access',
        action: 'override',
        changedBy,
        changedAt: {
          gte: weekAgo,
        },
      },
    });

    if (weeklyOverrides > RESTRICTED_OVERRIDE_WEEKLY_THRESHOLD) {
      const complianceOwner = await resolveComplianceOwnerReference();
      await createPatientReviewTask({
        medplumPatientId: input.medplumPatientId,
        taskCode: 'compliance-review',
        marker: `${RESTRICTED_OVERRIDE_COMPLIANCE_MARKER}:${changedBy}`,
        title: 'Restricted-access override threshold exceeded',
        description: `Staff ${changedBy} exceeded ${RESTRICTED_OVERRIDE_WEEKLY_THRESHOLD} restricted override requests in the trailing 7 days.`,
        changedBy,
        ownerReference: complianceOwner?.reference ?? null,
        ownerDisplay: complianceOwner?.display ?? null,
      });
    }

    await setAdminPatientFlash({ type: 'success', message: 'Restricted-tier access granted temporarily and audited.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function requestBreakGlassAccessAction(formData: FormData): Promise<void> {
  try {
    const { staff, practitioner, changedBy } = await getCoordinationWriterWithPractitioner();
    const input = requestBreakGlassAccessSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('break_glass.request', input.medplumPatientId, 'restricted_clinical_access');

    const expiresAt = new Date(Date.now() + ADMIN_PATIENT_RESTRICTED_ACCESS_TTL_MINUTES * 60 * 1000);
    const token = await prisma.destructiveApprovalToken.create({
      data: {
        medplumPatientId: input.medplumPatientId,
        actionType: 'break_glass_restricted_read',
        targetRecordId: input.medplumPatientId,
        payload: {
          reason: input.breakGlassReason,
          role: staff.staffRole,
          accessType: 'break_glass',
        },
        requestedBy: changedBy,
        expiresAt,
        status: 'pending',
      },
    });

    await recordAudit(
      {
        tableName: 'restricted_clinical_access',
        recordId: input.medplumPatientId,
        action: 'override',
        changedFields: {
          reason: input.breakGlassReason,
          role: staff.staffRole,
          mode: 'break-glass',
          tokenId: token.id,
          status: 'pending_approval',
          expiresAt: expiresAt.toISOString(),
        },
        changedBy,
        patientId: input.medplumPatientId,
        actorRole: staff.staffRole,
      },
      { critical: true },
    );

    const complianceOwner = await resolveComplianceOwnerReference();
    const adminOwners = await resolveAdminOwnerReferences();
    const alertRecipients = [
      ...(complianceOwner ? [complianceOwner] : []),
      ...adminOwners,
    ];

    for (const recipient of alertRecipients) {
      await createPatientCommunication({
        patientId: input.medplumPatientId,
        category: 'escalation',
        priority: 'stat',
        message: `Break-glass approval requested by ${staff.name ?? changedBy}. Token: ${token.id}. Reason: ${input.breakGlassReason}`,
        senderReference: practitioner.reference,
        senderDisplay: practitioner.display,
        recipientReference: recipient.reference,
        recipientDisplay: recipient.display ?? null,
      });
    }

    await createPatientReviewTask({
      medplumPatientId: input.medplumPatientId,
      taskCode: 'compliance-review',
      marker: `[break-glass]:${token.id}`,
      title: 'Break-glass access review required',
      description: `Approve or reject break-glass token ${token.id} for ${staff.name ?? changedBy}.`,
      changedBy,
      ownerReference: complianceOwner?.reference ?? null,
      ownerDisplay: complianceOwner?.display ?? null,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Break-glass request submitted for approval. Compliance/admin alerts were sent.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function approveDestructiveTokenAction(formData: FormData): Promise<void> {
  try {
    const input = approveDestructiveTokenSchema.parse(formDataToInput(formData));
    const token = await prisma.destructiveApprovalToken.findFirst({
      where: {
        id: input.approvalTokenId,
        medplumPatientId: input.medplumPatientId,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        requestedBy: true,
        actionType: true,
      },
    });

    if (!token) {
      throw new Error('Approval token is missing, expired, or already consumed.');
    }

    const { user: approver } = await requireStaffCan('break_glass.approve', {
      targetPatientMedplumId: input.medplumPatientId,
      audit: {
        tableName: 'destructive_approval_tokens',
        recordId: token.id,
      },
    });

    const now = new Date();
    const consumedBy =
      token.actionType === 'break_glass_restricted_read'
        ? token.requestedBy
        : approver.staffId;

    await prisma.destructiveApprovalToken.update({
      where: { id: token.id },
      data: {
        approvedBy: approver.staffId,
        approvedAt: now,
        consumedBy,
        consumedAt: now,
        status: 'consumed',
      },
    });

    await recordAudit(
      {
        tableName: 'destructive_approval_tokens',
        recordId: token.id,
        action: 'override',
        changedBy: approver.staffId,
        changedFields: {
          actionType: token.actionType,
          approvedBy: approver.staffId,
          consumedBy,
          status: 'consumed',
        },
        patientId: input.medplumPatientId,
        actorRole: approver.staffRole,
      },
      { critical: true },
    );

    await setAdminPatientFlash({ type: 'success', message: 'Approval token approved and consumed.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

