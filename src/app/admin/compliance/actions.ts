'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from '@/lib/utils/audit';

const resolveApprovalTokenSchema = z.object({
  approvalTokenId: z.string().trim().min(1, 'Approval token id is required.'),
  decision: z.enum(['approve', 'reject']),
});

export async function resolveApprovalTokenAction(formData: FormData): Promise<void> {
  const input = resolveApprovalTokenSchema.parse({
    approvalTokenId: formData.get('approvalTokenId'),
    decision: formData.get('decision'),
  });

  const token = await prisma.destructiveApprovalToken.findFirst({
    where: {
      id: input.approvalTokenId,
      status: 'pending',
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      actionType: true,
      medplumPatientId: true,
      targetRecordId: true,
      requestedBy: true,
    },
  });

  if (!token) {
    throw new Error('Approval token is missing, expired, or already resolved.');
  }

  const actionName = input.decision === 'approve' ? 'break_glass.approve' : 'break_glass.reject';
  const { user } = await requireStaffCan(actionName, {
    targetPatientMedplumId: token.medplumPatientId,
    audit: {
      tableName: 'destructive_approval_tokens',
      recordId: token.id,
    },
  });

  const now = new Date();
  const isApproved = input.decision === 'approve';
  const consumedBy = isApproved ? token.requestedBy : null;

  await prisma.destructiveApprovalToken.update({
    where: { id: token.id },
    data: {
      approvedBy: user.staffId,
      approvedAt: now,
      consumedBy,
      consumedAt: isApproved ? now : null,
      status: isApproved ? 'consumed' : 'rejected',
    },
  });

  await writeAuditLog({
    tableName: 'destructive_approval_tokens',
    recordId: token.id,
    action: 'override',
    changedBy: user.staffId,
    changedFields: {
      actionType: token.actionType,
      targetRecordId: token.targetRecordId,
      medplumPatientId: token.medplumPatientId,
      decision: input.decision,
      approvedBy: user.staffId,
      consumedBy,
      status: isApproved ? 'consumed' : 'rejected',
    },
  });

  revalidatePath('/admin/compliance');
  revalidatePath(`/admin/patients/${token.medplumPatientId}`);
}