import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from './prisma';

const AUDITED_MODELS = new Set([
  'Patient',
  'Visit',
  'MedicalHistory',
  'Allergy',
  'Medication',
  'Diagnosis',
  'VitalSigns',
  'ProgressNote',
  'ProgressNoteAddendum',
  'Document',
]);

function safeJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_key, innerValue: unknown) => {
      if (typeof innerValue === 'bigint') return innerValue.toString();
      return innerValue;
    })
  ) as Prisma.InputJsonValue;
}

function pickChangedFields(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data as Record<string, unknown>);
}

function resolveRecordId(result: unknown, fallbackWhere: unknown): string | null {
  if (result && typeof result === 'object' && 'id' in (result as Record<string, unknown>)) {
    const id = (result as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }

  if (fallbackWhere && typeof fallbackWhere === 'object' && 'id' in (fallbackWhere as Record<string, unknown>)) {
    const id = (fallbackWhere as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }

  return null;
}

function getDelegate(model: string): { findUnique?: (args: { where?: unknown }) => Promise<unknown> } | null {
  const delegateName = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
  const client = prisma as unknown as Record<string, unknown>;
  const delegate = client[delegateName] as { findUnique?: (args: { where?: unknown }) => Promise<unknown> } | undefined;
  return delegate ?? null;
}

async function writeAuditLog(params: {
  model: string;
  action: AuditAction;
  changedBy: string | null;
  changedFields: string[];
  previousData: unknown;
  newData: unknown;
  recordId: string | null;
}) {
  if (!params.recordId) return;

  await prisma.auditLog.create({
    data: {
      tableName: params.model,
      recordId: params.recordId,
      action: params.action,
      changedFields: params.changedFields,
      ...(safeJson(params.previousData) !== undefined ? { previousData: safeJson(params.previousData) } : {}),
      ...(safeJson(params.newData) !== undefined ? { newData: safeJson(params.newData) } : {}),
      changedBy: params.changedBy,
    },
  });
}

export function getAuditedPrisma(changedBy: string | null) {
  return prisma.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args);

          if (!AUDITED_MODELS.has(model)) return result;
          await writeAuditLog({
            model,
            action: AuditAction.create,
            changedBy,
            changedFields: pickChangedFields((args as { data?: unknown }).data),
            previousData: null,
            newData: result,
            recordId: resolveRecordId(result, (args as { where?: unknown }).where),
          });
          return result;
        },

        async update({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) {
            return query(args);
          }

          const where = (args as { where?: unknown }).where;
          const previousData = await getDelegate(model)?.findUnique?.({ where });
          const result = await query(args);

          await writeAuditLog({
            model,
            action: AuditAction.update,
            changedBy,
            changedFields: pickChangedFields((args as { data?: unknown }).data),
            previousData,
            newData: result,
            recordId: resolveRecordId(result, where),
          });
          return result;
        },

        async delete({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) {
            return query(args);
          }

          const where = (args as { where?: unknown }).where;
          const previousData = await getDelegate(model)?.findUnique?.({ where });
          const result = await query(args);

          await writeAuditLog({
            model,
            action: AuditAction.delete,
            changedBy,
            changedFields: [],
            previousData,
            newData: null,
            recordId: resolveRecordId(result, where),
          });
          return result;
        },

        async upsert({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) {
            return query(args);
          }

          const where = (args as { where?: unknown }).where;
          const previousData = await getDelegate(model)?.findUnique?.({ where });
          const result = await query(args);

          await writeAuditLog({
            model,
            action: previousData ? AuditAction.update : AuditAction.create,
            changedBy,
            changedFields: previousData
              ? pickChangedFields((args as { update?: unknown }).update)
              : pickChangedFields((args as { create?: unknown }).create),
            previousData,
            newData: result,
            recordId: resolveRecordId(result, where),
          });

          return result;
        },
      },
    },
  });
}
