import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { logger } from '@/lib/utils/app-logger';

/**
 * FHIR `Provenance` writer — the immutable "who did what, when" record attached to
 * a clinical resource. Used when a clinical note is signed and when a care report
 * is authored, so there is a standards-based attestation trail (beyond the
 * Postgres `AuditLog`/FHIR `AuditEvent` from Phase 1).
 *
 * Best-effort by design: a Provenance failure must never undo the clinical write
 * that already committed. Failures log at error level (never silently swallowed).
 * No PHI — only references, the acting clinician, and the activity.
 */

const PROVENANCE_AGENT_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/provenance-participant-type';
const DATA_OPERATION_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-DataOperation';

type FhirReference = { reference?: string; display?: string };

/** Standard `provenance-participant-type` roles we use. */
export type ProvenanceAgentRole = 'author' | 'attester' | 'verifier' | 'legal' | 'performer';

export type RecordProvenanceInput = {
  /** The resource this provenance is about, e.g. `Composition/123`. */
  targetReference: string;
  recordedAt?: Date;
  /** v3 DataOperation activity. */
  activity?: 'CREATE' | 'UPDATE' | 'APPEND';
  agents: Array<{ role: ProvenanceAgentRole; who: FhirReference }>;
};

export async function recordProvenance(input: RecordProvenanceInput): Promise<boolean> {
  if (input.agents.length === 0) {
    return false;
  }

  try {
    const medplum = await getMedplumClient();
    await medplum.createResource({
      resourceType: 'Provenance',
      target: [{ reference: input.targetReference }],
      recorded: (input.recordedAt ?? new Date()).toISOString(),
      activity: input.activity
        ? { coding: [{ system: DATA_OPERATION_SYSTEM, code: input.activity, display: input.activity.toLowerCase() }] }
        : undefined,
      agent: input.agents.map((agent) => ({
        type: { coding: [{ system: PROVENANCE_AGENT_TYPE_SYSTEM, code: agent.role, display: agent.role }] },
        who: agent.who,
      })),
    } as never);
    return true;
  } catch (error) {
    logger.error('PROVENANCE_WRITE_FAILED', {
      target: input.targetReference,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}
