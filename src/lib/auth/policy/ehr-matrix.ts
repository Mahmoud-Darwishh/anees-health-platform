/**
 * ============================================================================
 *  THE EHR ROLE MATRIX  —  who can do what, for every role
 * ============================================================================
 *
 * This is the single source of truth for permissions. It mirrors, line for
 * line, §3 of docs/EHR_ROLE_MATRIX.md (the human policy document). If you change
 * something here, change it there too — and vice-versa.
 *
 * You do NOT need to be a programmer to read or edit this file. Each block below
 * is one "module" (a thing in the app, like Vitals or Billing). Under it, each
 * role is listed with what they are allowed to do.
 *
 * ── THE FOUR ACCESS LEVELS (least → most power) ─────────────────────────────
 *   hidden — cannot see or use it at all. THIS IS THE DEFAULT. If a role is not
 *            listed under a module, that role has NO access to it.
 *   read   — can view, cannot change.
 *   write  — can create or edit DRAFTS (not yet legally final).
 *   sign   — can finalise. Once signed it is locked; only changeable by a
 *            formal versioned addendum (amend). "Delete" of clinical data never
 *            happens — records are marked entered-in-error, never erased.
 *
 * ── THE FOUR SCOPES (whose records the level applies to) ────────────────────
 *   global    — every patient on the platform.
 *   case      — only patients on this clinician's care team (their own cases).
 *   own       — only their own records / their own metrics or payouts.
 *   aggregate — anonymised totals only. No patient-identifying data (PHI).
 *
 * ── THE note FIELD ──────────────────────────────────────────────────────────
 *   Plain-English nuance the level can't express on its own, e.g.
 *   "administer + record doses", "draft only — a licensed clinician must sign",
 *   "co-sign required on red-flag vitals". Always optional.
 *
 * ── HOW TO EDIT (the only 3 things you'll ever do) ──────────────────────────
 *   1. Change what a role can do  → find the module, edit its level / note.
 *   2. Give a role new access     → add a line:  role: cell('read', 'global').
 *   3. Take access away           → delete the line (default becomes hidden).
 *   Then mirror the change in docs/EHR_ROLE_MATRIX.md §3. Done.
 *
 * Two roles are handled automatically and never need listing here:
 *   • superadmin    → can do everything (wildcard). Every action is audited.
 *   • operator      → treated exactly like medical_ops (legacy alias).
 *   • finance       → treated exactly like admin (legacy alias).
 *   • hospital_partner_admin → no staff access yet (built in the tenant phase).
 *   • Portal users (patients / caregivers) are NOT here — they use a separate,
 *     consent-based path (getOwnPatientRecord), by design.
 * ============================================================================
 */

import type { StaffRole } from '@prisma/client';

export type Capability = 'hidden' | 'read' | 'write' | 'sign';
export type AccessScope = 'global' | 'case' | 'own' | 'aggregate';

export type AccessCell = {
  level: Capability;
  scope: AccessScope;
  note?: string;
};

/** Power ranking so we can ask "does this role's level meet the one required?". */
const CAPABILITY_RANK: Record<Capability, number> = { hidden: 0, read: 1, write: 2, sign: 3 };

/** True if a role that HAS `have` is allowed to perform something needing `need`. */
export function meetsCapability(have: Capability, need: Capability): boolean {
  return CAPABILITY_RANK[have] >= CAPABILITY_RANK[need];
}

/** Tiny constructor to keep the grid below short and readable. */
function cell(level: Capability, scope: AccessScope = 'global', note?: string): AccessCell {
  return note ? { level, scope, note } : { level, scope };
}

/** Roles that are just another role for permission purposes. Resolved on lookup. */
const ROLE_ALIASES: Partial<Record<StaffRole, StaffRole>> = {
  operator: 'medical_ops',
};

// The full role list lives in role-constants.ts (one source). Re-exported here
// so `policy/index.ts` keeps exposing it. Relative path on purpose — the
// lint:rbac ts-node script loads this file without path-alias support.
export { ALL_STAFF_ROLES } from '../role-constants';

type ModuleAccess = Partial<Record<StaffRole, AccessCell>>;

/**
 * THE GRID. One entry per module. `access` lists only the roles that have some
 * access — every role not listed is `hidden` (deny by default).
 *
 * `medical_ops` rows show the LICENSED capability. An unlicensed Med-Ops user is
 * automatically downgraded to draft-only by the licence rule in can.ts, so we
 * only describe it once here.
 */
export const EHR_MATRIX = {
  // ── Patient identity ──────────────────────────────────────────────────────
  patient_demographics: {
    title: 'Patient demographics',
    description: 'Name, contacts, insurance fields, address, GPS.',
    access: {
      nurse: cell('read', 'case', 'assigned patients'),
      physiotherapist: cell('read', 'case', 'assigned patients'),
      doctor: cell('read', 'case', 'assigned patients'),
      medical_ops: cell('write', 'global'),
      insurance_coordinator: cell('read', 'global', 'claim fields only'),
      admin: cell('write', 'global'),
      compliance_officer: cell('read', 'global'),
      viewer: cell('read', 'aggregate'),
    } satisfies ModuleAccess,
  },
  patient_banner: {
    title: 'Patient banner (allergies + DNR + alerts)',
    description: 'Always-visible safety banner. Allergies are here, not a tab.',
    access: {
      nurse: cell('read', 'case', 'always visible'),
      physiotherapist: cell('read', 'case', 'always visible'),
      doctor: cell('read', 'case', 'always visible'),
      medical_ops: cell('read', 'global', 'always visible'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  allergies: {
    title: 'Allergies and intolerances',
    description: 'AllergyIntolerance records and safety reactions.',
    access: {
      nurse: cell('sign', 'case'),
      physiotherapist: cell('sign', 'case'),
      doctor: cell('sign', 'case'),
      medical_ops: cell('sign', 'global', 'only if clinically licensed; else draft'),
      insurance_coordinator: cell('read', 'global', 'claim-relevant'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Clinical documentation ────────────────────────────────────────────────
  vitals: {
    title: 'Vitals',
    description: 'BP, HR, temp, SpO2, glucose, weight, pain.',
    access: {
      nurse: cell('sign', 'case'),
      physiotherapist: cell('sign', 'case'),
      doctor: cell('sign', 'case', 'co-sign on red flags'),
      medical_ops: cell('sign', 'global'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  nursing_notes: {
    title: 'Nursing notes',
    description: 'Narrative nursing documentation (FHIR Composition).',
    access: {
      nurse: cell('sign', 'case', 'write + sign + amend'),
      physiotherapist: cell('read', 'case'),
      doctor: cell('read', 'case', 'co-sign'),
      medical_ops: cell('sign', 'global'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  physio_notes: {
    title: 'Physio notes',
    description: 'Physiotherapy session documentation.',
    access: {
      physiotherapist: cell('sign', 'case', 'write + sign + amend'),
      nurse: cell('read', 'case'),
      doctor: cell('read', 'case', 'co-sign'),
      medical_ops: cell('sign', 'global'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  medical_notes: {
    title: 'Medical notes',
    description: 'Physician documentation.',
    access: {
      doctor: cell('sign', 'case', 'write + sign + amend'),
      nurse: cell('read', 'case'),
      physiotherapist: cell('read', 'case'),
      medical_ops: cell('write', 'global', 'draft only — even a licensed nurse cannot sign physician notes'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Diagnoses (discipline-bound) ──────────────────────────────────────────
  nursing_diagnoses: {
    title: 'Nursing diagnoses (NANDA)',
    description: 'Nursing-discipline diagnoses.',
    access: {
      nurse: cell('sign', 'case'),
      physiotherapist: cell('read', 'case'),
      doctor: cell('read', 'case'),
      medical_ops: cell('sign', 'global', 'only if RN-licensed; else draft'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  pt_diagnoses: {
    title: 'PT diagnoses (movement-system)',
    description: 'Physiotherapy-discipline diagnoses.',
    access: {
      physiotherapist: cell('sign', 'case'),
      nurse: cell('read', 'case'),
      doctor: cell('read', 'case'),
      medical_ops: cell('sign', 'global', 'only if PT-licensed; else draft'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  medical_diagnoses: {
    title: 'Medical diagnoses (ICD-10)',
    description: 'Physician-discipline diagnoses.',
    access: {
      doctor: cell('sign', 'case'),
      nurse: cell('read', 'case'),
      physiotherapist: cell('read', 'case'),
      medical_ops: cell('write', 'global', 'draft only — physician scope'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Medications ───────────────────────────────────────────────────────────
  medication_prescribe: {
    title: 'Medication — prescribe new',
    description: 'Creating a new prescription.',
    access: {
      doctor: cell('sign', 'case'),
      medical_ops: cell('write', 'global', 'draft only'),
      insurance_coordinator: cell('read', 'global'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  medication_administer: {
    title: 'Medication — administer / record dose',
    description: 'Recording a dose given during a visit.',
    access: {
      nurse: cell('sign', 'case', 'administer + record'),
      doctor: cell('sign', 'case', 'record'),
      physiotherapist: cell('read', 'case'),
      medical_ops: cell('sign', 'global', 'administer + record'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  medication_reconciliation: {
    title: 'Medication reconciliation',
    description: 'Reconciling the active medication list.',
    access: {
      doctor: cell('sign', 'case', 'reconcile + sign'),
      nurse: cell('write', 'case', 'flag discrepancies'),
      physiotherapist: cell('write', 'case', 'flag discrepancies'),
      medical_ops: cell('write', 'global', 'flag + draft'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Labs & care plan ──────────────────────────────────────────────────────
  lab_order: {
    title: 'Lab — order',
    description: 'Ordering laboratory tests.',
    access: {
      doctor: cell('sign', 'case'),
      nurse: cell('write', 'case', 'execute standing order'),
      physiotherapist: cell('write', 'case', 'execute standing order'),
      medical_ops: cell('write', 'global', 'draft only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  lab_interpret: {
    title: 'Lab — interpret + report',
    description: 'Interpreting results into the chart.',
    access: {
      doctor: cell('sign', 'case'),
      nurse: cell('read', 'case'),
      physiotherapist: cell('read', 'case'),
      medical_ops: cell('write', 'global', 'draft only'),
      insurance_coordinator: cell('read', 'global', 'signed only'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  care_plan: {
    title: 'Care plan (master)',
    description: 'The patient’s master clinical programme + rehab goals.',
    access: {
      doctor: cell('sign', 'case', 'author + sign'),
      nurse: cell('write', 'case', 'progress updates'),
      physiotherapist: cell('write', 'case', 'progress updates'),
      medical_ops: cell('write', 'global', 'draft + propose'),
      insurance_coordinator: cell('read', 'global'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  assessments: {
    title: 'Assessments (falls, Braden, MMSE, gait/ROM)',
    description: 'Structured clinical assessments.',
    access: {
      nurse: cell('sign', 'case'),
      physiotherapist: cell('sign', 'case'),
      doctor: cell('sign', 'case'),
      medical_ops: cell('sign', 'global', 'only if licensed; else draft'),
      insurance_coordinator: cell('read', 'global'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Care coordination ─────────────────────────────────────────────────────
  care_team: {
    title: 'Care team assignment',
    description: 'Who is assigned to a patient.',
    access: {
      medical_ops: cell('write', 'global', 'assign / reassign'),
      nurse: cell('read', 'case', 'own'),
      physiotherapist: cell('read', 'case', 'own'),
      doctor: cell('read', 'case', 'own'),
      admin: cell('write', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  tasks: {
    title: 'Tasks / handoffs',
    description: 'Work queue: co-signs, handoffs, follow-ups.',
    access: {
      nurse: cell('write', 'case', 'own queue + create'),
      physiotherapist: cell('write', 'case', 'own queue + create'),
      doctor: cell('write', 'case', 'own queue + create'),
      medical_ops: cell('write', 'global', 'full board + reassign'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Field operations ──────────────────────────────────────────────────────
  visits_schedule: {
    title: 'Visits — schedule / reschedule / cancel',
    description: 'Booking and changing visits.',
    access: {
      nurse: cell('read', 'case', 'own'),
      physiotherapist: cell('read', 'case', 'own'),
      doctor: cell('read', 'case', 'own'),
      medical_ops: cell('write', 'global', 'full'),
      insurance_coordinator: cell('read', 'global', 'claim-linked'),
      admin: cell('write', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
      viewer: cell('read', 'aggregate'),
    } satisfies ModuleAccess,
  },
  visit_checkin_checkout: {
    title: 'Visit check-in / check-out',
    description: 'The clinician’s on-site visit flow (geofenced).',
    access: {
      nurse: cell('write', 'case', 'own visits'),
      physiotherapist: cell('write', 'case', 'own visits'),
      doctor: cell('write', 'case', 'own visits'),
      medical_ops: cell('write', 'global', 'view all + override'),
      admin: cell('read', 'global', 'view all'),
      compliance_officer: cell('read', 'global'),
      viewer: cell('read', 'aggregate'),
    } satisfies ModuleAccess,
  },
  dispatch_board: {
    title: 'Live dispatch board (map)',
    description: 'Uber-style live view of clinicians + pending visits.',
    access: {
      medical_ops: cell('read', 'global', 'full live view'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Documents & communications ────────────────────────────────────────────
  documents: {
    title: 'Documents (labs, scans, reports)',
    description: 'Medical file attachments.',
    access: {
      nurse: cell('write', 'case', 'upload + view'),
      physiotherapist: cell('write', 'case', 'upload + view'),
      doctor: cell('sign', 'case', 'upload + sign reports'),
      medical_ops: cell('write', 'global', 'upload + manage'),
      insurance_coordinator: cell('read', 'global', 'claim-linked'),
      admin: cell('write', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  escalations: {
    title: 'Escalations',
    description: 'Raising and triaging clinical/operational escalations.',
    access: {
      nurse: cell('write', 'case', 'raise + view own'),
      physiotherapist: cell('write', 'case', 'raise + view own'),
      doctor: cell('write', 'case', 'raise + view own'),
      medical_ops: cell('write', 'global', 'triage / close'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  incident_reports: {
    title: 'Incident reports',
    description: 'Safety incidents (falls, med errors, adverse events).',
    access: {
      doctor: cell('sign', 'case', 'file + sign'),
      nurse: cell('write', 'case', 'file + read own'),
      physiotherapist: cell('write', 'case', 'file + read own'),
      medical_ops: cell('write', 'global', 'triage + close'),
      insurance_coordinator: cell('read', 'global', 'claim-relevant'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global', 'read all'),
    } satisfies ModuleAccess,
  },
  communications: {
    title: 'Communications (in-platform messages)',
    description: 'Staff↔patient and staff↔staff messaging.',
    access: {
      nurse: cell('write', 'case', 'send / receive'),
      physiotherapist: cell('write', 'case', 'send / receive'),
      doctor: cell('write', 'case', 'send / receive'),
      medical_ops: cell('write', 'global', 'send / receive'),
      insurance_coordinator: cell('write', 'global', 'claim-related'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  consent_records: {
    title: 'Consent records (caregiver scopes)',
    description: 'Caregiver portal access grants.',
    access: {
      medical_ops: cell('write', 'global', 'grant / revoke'),
      nurse: cell('read', 'case'),
      physiotherapist: cell('read', 'case'),
      doctor: cell('read', 'case'),
      insurance_coordinator: cell('read', 'global', 'for claims'),
      admin: cell('write', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Sensitive & controlled ────────────────────────────────────────────────
  restricted_tier: {
    title: 'Restricted-tier data (mental health, HIV, reproductive, DV)',
    description:
      'Extra-protected resources. Treating clinicians get gated access with a typed reason; ' +
      'admin & med-ops are hidden by default; only Compliance has standing access. Patients always see their own.',
    access: {
      nurse: cell('read', 'case', 'gated re-auth + reason'),
      physiotherapist: cell('read', 'case', 'gated re-auth + reason'),
      doctor: cell('read', 'case', 'gated re-auth + reason'),
      compliance_officer: cell('read', 'global', 'standing access — read all'),
    } satisfies ModuleAccess,
  },
  standing_orders: {
    title: 'Standing orders (doctor pre-auth panel)',
    description: 'Recurring orders a solo clinician can execute without per-visit MD approval.',
    access: {
      doctor: cell('sign', 'case', 'author + sign'),
      nurse: cell('write', 'case', 'execute'),
      physiotherapist: cell('write', 'case', 'execute'),
      medical_ops: cell('write', 'global', 'execute on behalf'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  controlled_substance_ledger: {
    title: 'Controlled-substance ledger (EDA)',
    description: 'Immutable, serialised controlled-medication register.',
    access: {
      doctor: cell('sign', 'case', 'prescribe + sign + reconcile'),
      nurse: cell('write', 'case', 'record administration'),
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global', 'read all'),
    } satisfies ModuleAccess,
  },

  // ── Billing & insurance ───────────────────────────────────────────────────
  billing_invoices: {
    title: 'Billing / invoices',
    description: 'Invoices, payments, finance.',
    access: {
      insurance_coordinator: cell('write', 'global', 'view + draft claim'),
      medical_ops: cell('read', 'global'),
      finance: cell('sign', 'global', 'finance operations'),
      admin: cell('sign', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  provider_payouts: {
    title: 'Provider payouts',
    description: 'Clinician earnings and payouts.',
    access: {
      nurse: cell('read', 'own'),
      physiotherapist: cell('read', 'own'),
      doctor: cell('read', 'own'),
      medical_ops: cell('read', 'global'),
      finance: cell('sign', 'global', 'approve and reconcile payouts'),
      admin: cell('sign', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  insurance_claims: {
    title: 'Insurance claims / pre-auth',
    description: 'Claim drafting, submission and adjudication.',
    access: {
      insurance_coordinator: cell('write', 'global', 'full draft + submit'),
      medical_ops: cell('write', 'global', 'full draft + submit'),
      finance: cell('read', 'global', 'financial review'),
      doctor: cell('sign', 'case', 'claim attestation'),
      nurse: cell('write', 'case', 'flag claim-relevant'),
      physiotherapist: cell('write', 'case', 'flag claim-relevant'),
      admin: cell('write', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  promocodes_pricing: {
    title: 'Promocodes / pricing',
    description: 'Discount codes and service pricing.',
    access: {
      medical_ops: cell('read', 'global'),
      finance: cell('read', 'global'),
      admin: cell('write', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },

  // ── Governance & administration ───────────────────────────────────────────
  audit_log: {
    title: 'Audit log',
    description: 'The tamper-evident record of who did what.',
    access: {
      admin: cell('read', 'global'),
      compliance_officer: cell('read', 'global', 'full read'),
    } satisfies ModuleAccess,
  },
  staff_user_mgmt: {
    title: 'Staff / user management + role grants',
    description: 'Creating staff and granting roles.',
    access: {
      admin: cell('sign', 'global', 'full'),
      compliance_officer: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
  aggregate_kpis: {
    title: 'Aggregate KPIs / dashboards',
    description: 'Business and operational dashboards.',
    access: {
      nurse: cell('read', 'own', 'own metrics'),
      physiotherapist: cell('read', 'own', 'own metrics'),
      doctor: cell('read', 'own', 'own metrics'),
      medical_ops: cell('read', 'global', 'full ops view'),
      insurance_coordinator: cell('read', 'global', 'claims metrics'),
      finance: cell('read', 'global', 'financial KPIs'),
      admin: cell('read', 'global', 'full'),
      compliance_officer: cell('read', 'global', 'full'),
      viewer: cell('read', 'aggregate', 'no PHI'),
    } satisfies ModuleAccess,
  },

  // ── App workspace access (operational, not a clinical module) ─────────────
  physio_workspace: {
    title: 'Physiotherapist workspace (/clinician/*)',
    description: 'May open the physio field-clinician app. Not a clinical record.',
    access: {
      physiotherapist: cell('read', 'case'),
      admin: cell('read', 'global'),
    } satisfies ModuleAccess,
  },
};

/** The set of valid module names. Using a wrong one is a compile error. */
export type ModuleKey = keyof typeof EHR_MATRIX;

/**
 * Resolve one cell: what may `role` do in `moduleKey`?
 * Handles superadmin (everything), aliases, and the deny-by-default fallback.
 */
export function cellForRole(moduleKey: ModuleKey, role: StaffRole): AccessCell {
  if (role === 'superadmin') {
    return { level: 'sign', scope: 'global', note: 'platform super-admin (wildcard)' };
  }
  const canonical = ROLE_ALIASES[role] ?? role;
  const access = EHR_MATRIX[moduleKey].access as ModuleAccess;
  return access[canonical] ?? { level: 'hidden', scope: 'global' };
}

/**
 * The "show me everything this role can do" view — handy for a non-technical
 * reviewer or an admin screen. Returns every module the role can touch.
 */
export function permissionsForRole(
  role: StaffRole,
): Array<{ module: ModuleKey; title: string; level: Capability; scope: AccessScope; note?: string }> {
  return (Object.keys(EHR_MATRIX) as ModuleKey[])
    .map((module) => {
      const c = cellForRole(module, role);
      return { module, title: EHR_MATRIX[module].title, level: c.level, scope: c.scope, note: c.note };
    })
    .filter((entry) => entry.level !== 'hidden');
}
