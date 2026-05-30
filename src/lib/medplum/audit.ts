import 'server-only';

import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type MedplumAuditMirrorInput = {
  tableName: string;
  recordId: string;
  action: AuditAction;
  changedBy: string;
  changedFields: string[];
  newData?: unknown;
  previousData?: unknown;
};

function safeJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(
    JSON.stringify(value, (_key, innerValue: unknown) => {
      if (typeof innerValue === 'bigint') return innerValue.toString();
      return innerValue;
    }),
  ) as Prisma.InputJsonValue;
}

/**
 * Medplum AuditEvent is the source of truth for clinical changes.
 * This Postgres row is a best-effort convenience mirror for local reporting.
 */
export async function writeMedplumAuditMirror(
  params: MedplumAuditMirrorInput,
): Promise<void> {
  try {
    const newData = safeJson(params.newData);
    const previousData = safeJson(params.previousData);

    await prisma.auditLog.create({
      data: {
        tableName: params.tableName,
        recordId: params.recordId,
        action: params.action,
        changedBy: params.changedBy,
        changedFields: params.changedFields,
        ...(newData !== undefined ? { newData } : {}),
        ...(previousData !== undefined ? { previousData } : {}),
      },
    });
  } catch (error) {
    console.warn('Best-effort Medplum audit mirror write failed', {
      tableName: params.tableName,
      recordId: params.recordId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
