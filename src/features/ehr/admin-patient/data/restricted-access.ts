import 'server-only';
import { prisma } from '@/lib/db/prisma';
import type { AdminPatientDetailData } from '../types';

export type RestrictedAccessCookiePayload = {
  patientId: string;
  reason: string;
  grantedAt: string;
};

function hasRestrictedSignal(text: string): boolean {
  const keywords = ['hiv', 'sti', 'mental', 'psychi', 'reproductive', 'domestic violence', 'substance'];
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function isRestrictedTierItem(params: {
  structuredFlag?: boolean;
  fallbackText?: string;
}): boolean {
  if (params.structuredFlag) {
    return true;
  }
  return params.fallbackText ? hasRestrictedSignal(params.fallbackText) : false;
}

export function canBypassRestrictedReason(role: AdminPatientDetailData['staffRole']): boolean {
  return role === 'compliance_officer' || role === 'superadmin';
}

export async function getRestrictedAccessGrant(
  patientId: string,
  staffId: string,
): Promise<RestrictedAccessCookiePayload | null> {
  const token = await prisma.destructiveApprovalToken.findFirst({
    where: {
      medplumPatientId: patientId,
      actionType: {
        in: ['restricted_read', 'break_glass_restricted_read'],
      },
      status: 'consumed',
      consumedBy: staffId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      consumedAt: 'desc',
    },
    select: {
      payload: true,
      consumedAt: true,
    },
  });

  if (!token) {
    return null;
  }

  const payload = token.payload && typeof token.payload === 'object' && !Array.isArray(token.payload)
    ? token.payload as Record<string, unknown>
    : {};
  const reason = typeof payload.reason === 'string' ? payload.reason : null;
  if (!reason) {
    return null;
  }
  return {
    patientId,
    reason,
    grantedAt: token.consumedAt?.toISOString() ?? new Date().toISOString(),
  };
}
