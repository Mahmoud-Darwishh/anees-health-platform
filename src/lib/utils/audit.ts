import 'server-only';

import { after } from 'next/server';
import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/app-logger';
import { computeAuditHash } from '@/lib/utils/audit-hash';

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'> | typeof prisma;

/**
 * Best-effort tamper-evidence: chain this row's content to the previous row's
 * hash. NEVER throws — integrity metadata is additive, and a hashing/read failure
 * must never block the audit write itself. On any error both columns stay null
 * and the row is written exactly as before.
 */
async function resolveAuditIntegrity(
  input: WriteAuditLogInput,
  client: AuditClient,
): Promise<{ hash: string | null; prevHash: string | null }> {
  try {
    const latest = await client.auditLog.findFirst({
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
      select: { hash: true },
    });
    const prevHash = latest?.hash ?? null;
    const hash = computeAuditHash(
      {
        tableName: input.tableName,
        recordId: input.recordId,
        action: input.action,
        changedBy: input.changedBy ?? null,
        changedFields: input.changedFields ?? null,
        previousData: input.previousData ?? null,
        newData: input.newData ?? null,
      },
      prevHash,
    );
    return { hash, prevHash };
  } catch {
    return { hash: null, prevHash: null };
  }
}

export type WriteAuditLogInput = {
  tableName: string;
  recordId: string;
  action: AuditAction;
  changedBy?: string | null;
  changedFields?: Prisma.InputJsonValue | null;
  previousData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
};

/**
 * Low-level, transaction-aware Postgres audit write. THROWS on failure.
 * Use directly when you need the audit row inside the same DB transaction as the
 * mutation (pass the transaction client). For application mutations that are not
 * in a transaction, prefer `recordAudit`, which adds retry + a FHIR mirror.
 */
export async function writeAuditLog(input: WriteAuditLogInput, client: AuditClient = prisma): Promise<void> {
  const integrity = await resolveAuditIntegrity(input, client);
  await client.auditLog.create({
    data: {
      tableName: input.tableName,
      recordId: input.recordId,
      action: input.action,
      changedBy: input.changedBy ?? null,
      changedFields: input.changedFields ?? undefined,
      previousData: input.previousData ?? undefined,
      newData: input.newData ?? undefined,
      // `?? undefined` (not null) so Prisma OMITS these columns from the INSERT
      // when there's no hash. Combined with the missing-column SELECT in
      // resolveAuditIntegrity being caught, this makes the code safe to run
      // against a DB where the migration has not been applied yet — the audit
      // row still writes; it just carries no integrity metadata.
      hash: integrity.hash ?? undefined,
      prevHash: integrity.prevHash ?? undefined,
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

// ── Canonical dual-store audit ───────────────────────────────────────────────

export type RecordAuditInput = WriteAuditLogInput & {
  /** Optional patient context → adds a `Patient` entity to the FHIR mirror. */
  patientId?: string | null;
  /** Optional FHIR `Practitioner` reference for a richer `agent.who`. */
  actorReference?: string | null;
  actorDisplay?: string | null;
  actorRole?: string | null;
  /** FHIR outcome code; derived from `action` when omitted. */
  outcome?: '0' | '4' | '8' | '12';
  /** When the audited action happened. Defaults to now. */
  recordedAt?: Date;
};

const AUDIT_MAX_ATTEMPTS = 3;

/**
 * Durable Postgres write with bounded retry. On persistent failure it logs at
 * ERROR level with a stable, greppable marker (`AUDIT_WRITE_FAILED`) and returns
 * `false` — it is NEVER silently swallowed. Returns `true` on success.
 */
async function persistAuditWithRetry(input: WriteAuditLogInput): Promise<boolean> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= AUDIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      await writeAuditLog(input);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  logger.error('AUDIT_WRITE_FAILED', {
    tableName: input.tableName,
    recordId: input.recordId,
    action: input.action,
    attempts: AUDIT_MAX_ATTEMPTS,
    error: lastError instanceof Error ? lastError.message : 'unknown',
  });
  return false;
}

/**
 * Best-effort FHIR `AuditEvent` mirror, scheduled OFF the request's critical path
 * via `after()` so it adds no latency and a Medplum outage cannot block the user
 * operation. Lazily imported to keep this (widely-imported) module free of a
 * static dependency on the Medplum client. Falls back to a detached run when no
 * request scope is available (e.g. a background job).
 */
function scheduleFhirMirror(input: RecordAuditInput): void {
  const run = async () => {
    try {
      const { writeFhirAuditEvent } = await import('@/lib/medplum/audit-event');
      await writeFhirAuditEvent({
        tableName: input.tableName,
        recordId: input.recordId,
        action: input.action,
        changedBy: input.changedBy,
        actorReference: input.actorReference,
        actorDisplay: input.actorDisplay,
        actorRole: input.actorRole,
        patientId: input.patientId,
        outcome: input.outcome,
        recordedAt: input.recordedAt,
      });
    } catch (error) {
      logger.error('AUDIT_FHIR_MIRROR_SCHEDULE_FAILED', {
        tableName: input.tableName,
        recordId: input.recordId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  try {
    after(run);
  } catch {
    // No request scope (`after` is unavailable) — fall back to a detached run.
    void run();
  }
}

/**
 * Canonical audit entry point for application mutations.
 *
 * 1. **Durable Postgres `AuditLog` write**, retried, NEVER silently swallowed.
 *    - `critical: true` → a persistent failure THROWS, so the caller aborts. Use
 *      for access grants / break-glass / overrides where an un-auditable action
 *      must be denied.
 *    - default → a persistent failure is logged at ERROR level and the caller
 *      proceeds. Use for post-hoc clinical-write mirrors, where the mutation has
 *      already committed and blocking it helps no one.
 * 2. **Best-effort FHIR `AuditEvent` mirror**, OFF the critical path via `after()`.
 *
 * Do NOT call this inside a Prisma transaction (the FHIR mirror must not run in a
 * transaction). For transactional audit use `writeAuditLog(input, txClient)`.
 */
export async function recordAudit(
  input: RecordAuditInput,
  options?: { critical?: boolean },
): Promise<void> {
  const persisted = await persistAuditWithRetry(input);
  if (!persisted && options?.critical) {
    throw new Error('Audit write failed for a security-critical action; operation aborted.');
  }
  scheduleFhirMirror(input);
}
