import 'server-only';

import type { AuditAction, Prisma } from '@prisma/client';
import { recordAudit } from '@/lib/utils/audit';

export type MedplumAuditMirrorInput = {
  tableName: string;
  recordId: string;
  action: AuditAction;
  changedBy: string;
  changedFields: string[];
  newData?: unknown;
  previousData?: unknown;
  // Optional enrichment for the FHIR `AuditEvent` half. All back-compat optional,
  // so the existing call sites keep working unchanged; pass them when available
  // for a richer, more useful audit trail.
  patientId?: string | null;
  actorReference?: string | null;
  actorDisplay?: string | null;
  actorRole?: string | null;
};

function safeJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  return JSON.parse(
    JSON.stringify(value, (_key, innerValue: unknown) =>
      typeof innerValue === 'bigint' ? innerValue.toString() : innerValue,
    ),
  ) as Prisma.InputJsonValue;
}

/**
 * Dual-store audit for a clinical write (Medplum mutation).
 *
 * Delegates to the canonical `recordAudit`: a durable Postgres `AuditLog` row
 * (retried, never silently swallowed) plus a best-effort FHIR `AuditEvent` mirror
 * on Medplum, written off the request's critical path.
 *
 * Historically this wrote only a best-effort Postgres row and — despite the name
 * — never created a FHIR `AuditEvent`. It now does both. See `docs/EHR_AUDIT.md`
 * Phase 1. The name is retained so the ~14 existing call sites need no change.
 */
export async function writeMedplumAuditMirror(params: MedplumAuditMirrorInput): Promise<void> {
  await recordAudit({
    tableName: params.tableName,
    recordId: params.recordId,
    action: params.action,
    changedBy: params.changedBy,
    changedFields: params.changedFields,
    newData: safeJson(params.newData),
    previousData: safeJson(params.previousData),
    patientId: params.patientId ?? null,
    actorReference: params.actorReference ?? null,
    actorDisplay: params.actorDisplay ?? null,
    actorRole: params.actorRole ?? null,
  });
}
