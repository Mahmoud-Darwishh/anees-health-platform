import 'server-only';

import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'> | typeof prisma;

export type WriteAuditLogInput = {
  tableName: string;
  recordId: string;
  action: AuditAction;
  changedBy?: string | null;
  changedFields?: Prisma.InputJsonValue | null;
  previousData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
};

export async function writeAuditLog(input: WriteAuditLogInput, client: AuditClient = prisma): Promise<void> {
  await client.auditLog.create({
    data: {
      tableName: input.tableName,
      recordId: input.recordId,
      action: input.action,
      changedBy: input.changedBy ?? null,
      changedFields: input.changedFields ?? undefined,
      previousData: input.previousData ?? undefined,
      newData: input.newData ?? undefined,
    },
  });
}

export async function writeAuditLogBestEffort(input: WriteAuditLogInput, client: AuditClient = prisma): Promise<void> {
  try {
    await writeAuditLog(input, client);
  } catch {
    // Audit logging must be explicit at call sites. Best-effort is only for
    // secondary telemetry where blocking care delivery would be unsafe.
  }
}

