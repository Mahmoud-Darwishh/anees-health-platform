import 'server-only';

import type { AuditAction } from '@prisma/client';
import { getMedplumClient } from '@/lib/medplum/client';
import { logger } from '@/lib/utils/app-logger';

/**
 * FHIR `AuditEvent` (R4) mirror of an Anees audit record.
 *
 * The Postgres `AuditLog` row is the durable PRIMARY (fast to query for the
 * compliance dashboard, survives a Medplum outage). This module adds the
 * standards-based, interoperable half — a FHIR `AuditEvent` on Medplum — which a
 * hospital-integration partner or external auditor expects to consume.
 *
 * It is deliberately BEST-EFFORT and runs OFF the request's critical path (see
 * `recordAudit` in `@/lib/utils/audit`): a Medplum failure must never lose the
 * already-persisted Postgres record nor block care delivery. Failures are logged
 * at error level (never silently swallowed) for later reconciliation.
 *
 * NO PHI is written here — only resource references/ids, the acting staff id,
 * role, and the action. Never put names, notes, or clinical values in an
 * `AuditEvent`.
 */

// Custom code system for the fine-grained Anees action (the standard `action`
// field only has C/R/U/D/E, which collapses override/login/logout/access_denied).
const AUDIT_ACTION_SYSTEM = 'https://anees.health/fhir/CodeSystem/audit-action';

// Standard HL7 / DICOM systems for the spec-required codings.
const FHIR_AUDIT_EVENT_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/audit-event-type';
const FHIR_AUDIT_ENTITY_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/audit-entity-type';
const FHIR_OBJECT_ROLE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/object-role';
const FHIR_AUDIT_SOURCE_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/security-source-type';
const DICOM_SYSTEM = 'http://dicom.nema.org/resources/ontology/DCM';

const ANEES_STAFF_IDENTIFIER_SYSTEM = 'https://anees.health/fhir/identifier/staff-id';

type FhirCoding = { system?: string; code?: string; display?: string };
type FhirReference = {
  reference?: string;
  display?: string;
  identifier?: { system?: string; value?: string };
};

export type FhirAuditEventInput = {
  /** Logical resource family touched (e.g. `MedplumObservation`, `patients`). */
  tableName: string;
  /** Affected resource id(s). May be a comma-joined list or a composite key. */
  recordId: string;
  action: AuditAction;
  /** Staff id of the actor (an id, never a name). */
  changedBy?: string | null;
  /** Optional FHIR `Practitioner` reference for a richer `agent.who`. */
  actorReference?: string | null;
  actorDisplay?: string | null;
  actorRole?: string | null;
  /** Optional patient context → adds a `Patient` entity to the event. */
  patientId?: string | null;
  /** FHIR outcome code; derived from `action` when omitted. */
  outcome?: '0' | '4' | '8' | '12';
  /** When the audited action happened. Defaults to now. */
  recordedAt?: Date;
};

type AuditEventResource = {
  resourceType: 'AuditEvent';
  type: FhirCoding;
  subtype?: FhirCoding[];
  action?: 'C' | 'R' | 'U' | 'D' | 'E';
  recorded: string;
  outcome?: '0' | '4' | '8' | '12';
  agent: Array<{
    type?: { coding?: FhirCoding[] };
    who?: FhirReference;
    requestor: boolean;
    role?: Array<{ text?: string }>;
  }>;
  source: {
    observer: FhirReference;
    type?: FhirCoding[];
  };
  entity?: Array<{
    what?: FhirReference;
    type?: FhirCoding;
    role?: FhirCoding;
  }>;
};

// Standard FHIR AuditEvent.action: C(reate) R(ead) U(pdate) D(elete) E(xecute).
const ACTION_CODE: Record<AuditAction, 'C' | 'R' | 'U' | 'D' | 'E'> = {
  create: 'C',
  read: 'R',
  update: 'U',
  delete: 'D',
  export: 'E',
  override: 'U',
  access_denied: 'R',
  login: 'E',
  logout: 'E',
};

function defaultOutcome(action: AuditAction): '0' | '4' {
  // 0 = Success, 4 = Minor failure. A denied access is a (benign) failure.
  return action === 'access_denied' ? '4' : '0';
}

function eventTypeCoding(action: AuditAction): FhirCoding {
  if (action === 'login' || action === 'logout') {
    return { system: DICOM_SYSTEM, code: '110114', display: 'User Authentication' };
  }
  return { system: FHIR_AUDIT_EVENT_TYPE_SYSTEM, code: 'rest', display: 'RESTful Operation' };
}

export function buildAuditEvent(input: FhirAuditEventInput): AuditEventResource {
  const recorded = (input.recordedAt ?? new Date()).toISOString();
  const actorId = input.changedBy ?? 'system';

  const entity: NonNullable<AuditEventResource['entity']> = [
    {
      what: { display: `${input.tableName}/${input.recordId}` },
      type: { system: FHIR_AUDIT_ENTITY_TYPE_SYSTEM, code: '2', display: 'System Object' },
    },
  ];

  if (input.patientId) {
    entity.push({
      what: { reference: `Patient/${input.patientId}` },
      type: { system: FHIR_AUDIT_ENTITY_TYPE_SYSTEM, code: '1', display: 'Person' },
      role: { system: FHIR_OBJECT_ROLE_SYSTEM, code: '1', display: 'Patient' },
    });
  }

  return {
    resourceType: 'AuditEvent',
    type: eventTypeCoding(input.action),
    subtype: [{ system: AUDIT_ACTION_SYSTEM, code: input.action, display: input.action }],
    action: ACTION_CODE[input.action],
    recorded,
    outcome: input.outcome ?? defaultOutcome(input.action),
    agent: [
      {
        type: input.actorRole ? { coding: [{ display: input.actorRole }] } : undefined,
        who: input.actorReference
          ? { reference: input.actorReference, display: input.actorDisplay ?? undefined }
          : {
              identifier: { system: ANEES_STAFF_IDENTIFIER_SYSTEM, value: actorId },
              display: input.actorDisplay ?? `staff:${actorId}`,
            },
        requestor: true,
        role: input.actorRole ? [{ text: input.actorRole }] : undefined,
      },
    ],
    source: {
      observer: { display: 'Anees Health EHR' },
      type: [{ system: FHIR_AUDIT_SOURCE_TYPE_SYSTEM, code: '4', display: 'Application Server' }],
    },
    entity,
  };
}

/**
 * Best-effort write of a FHIR `AuditEvent` to Medplum. Returns `true` on success,
 * `false` on any failure (which is logged at error level, never thrown). Callers
 * must already have persisted the durable Postgres `AuditLog` row.
 */
export async function writeFhirAuditEvent(input: FhirAuditEventInput): Promise<boolean> {
  try {
    const medplum = await getMedplumClient();
    await medplum.createResource(buildAuditEvent(input) as never);
    return true;
  } catch (error) {
    logger.error('AUDIT_FHIR_MIRROR_FAILED', {
      tableName: input.tableName,
      recordId: input.recordId,
      action: input.action,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}
