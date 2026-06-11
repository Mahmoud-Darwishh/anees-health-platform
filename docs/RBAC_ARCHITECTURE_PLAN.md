# Anees RBAC — Architecture Plan

> **Status:** Phase 0 shipped (the spine is in code); Phase 1 in progress. Last
> updated **2026-06-11**.
> **Purpose:** The canonical design for a world-class, scalable, compliance-grade
> authorization system for the Anees Health Platform.
> **Audience:** Founder, senior engineer, future hires, hospital procurement reviewers, auditors.
> **Companion docs:** [`EHR_ROLE_MATRIX.md`](./EHR_ROLE_MATRIX.md) (the human-readable matrix),
> [`CTO_STRATEGY.md`](./CTO_STRATEGY.md), [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md),
> [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md).
>
> **Read this before writing any RBAC code.** It is the agreed shape. If you
> disagree with a layer, change the doc first, then the code.

---

## 0. Why this document exists

Earlier RBAC attempts grew by patching: ship code → notice a gap → patch → notice
the next gap → patch again. On a regulated healthcare platform that pattern is not
just messy — it is how an audit finding or a breach happens. This document fixes the
*architecture first*, decides what we deliberately do NOT build, and only then
sequences the implementation.

Three mistakes we are explicitly correcting:

1. Treating "the role matrix in code" as the whole architecture. It is one slice of
   one layer. World-class RBAC is a **stack of layers**, not a single function.
2. Writing audit logs *inside* the authorization function — coupling latency and
   reliability concerns that must be separated.
3. Designing the decision function before defining the **identity model** it serves.

---

## 1. The 7-layer architecture (the target shape)

```
L7  NETWORK         Cloudflare WAF + IP allowlist for partners
L6  EDGE            Next.js middleware — coarse role/tenant gating per URL family
L5  ENFORCEMENT     Every server action / route / loader asks the decision layer (PEP)
L4  DECISION        ONE pure function: can(actor, action, resource) → verdict   (PDP)
L3  INFORMATION     Fetch attributes: license, CareTeam, consent, tenant        (PIP)
L2  POLICY STORE    Where policies live: TS matrix → Postgres → engine          (PAP)
L1  DATA            Postgres RLS + Medplum per-tenant Project (defense in depth)
L0  AUDIT           Decisions emitted as events → written asynchronously
```

Each layer is a **wall**. Bypass one, you still hit the next. As of 2026-06-11 the
edge (L6), enforcement (L5), decision (L4) and information (L3) layers are live; L6
now **denies by default** for unlisted staff routes. The audit writer (L0) and
Postgres RLS (L1) are the remaining gaps — see §13.

| Layer | Owns | Does NOT own |
|---|---|---|
| L7 Network | TLS, DDoS, IP allowlists | Per-user logic |
| L6 Edge middleware | "Is this user allowed in this URL family at all?" | Specific record access |
| L5 Enforcement (PEP) | "Did we ASK before doing this?" | Deciding the answer |
| L4 Decision (PDP) | "Given inputs, allow or deny." Pure function. | Fetching data; writing audit |
| L3 Info (PIP) | Fetching license / team / consent / tenant | Caching policy |
| L2 Policy store | The matrix; the admin UI to edit it | Decision logic |
| L1 Data | RLS / AccessPolicy backstops | App-layer rules |
| L0 Audit | "What happened?" | Allowing/denying |

---

## 2. The identity model (first-class actors)

Every decision starts with "who is asking?". The actor types:

| Actor | Auth | Tenant | Carries | Path |
|---|---|---|---|---|
| **Patient** | OTP / Google / case-ID + password | their record's | `patientId` | `getOwnPatientRecord` — NOT the staff PDP |
| **Caregiver** | same as patient | loved-one's | `patientId` + FHIR `Consent` scopes | portal path; consent-scoped |
| **Staff (clinical)** | email + password | employer | `staffId`, `staffRole`, `clinicalLicense*` | staff PDP; CareTeam + license gated |
| **Staff (ops)** | email + password | employer | `staffId`, `staffRole` | staff PDP; global within tenant |
| **Hospital Partner Admin** | OIDC (Phase 1+) | their hospital | federated identity, tenant-scoped | staff PDP; always tenant-scoped |
| **Service Account** | rotating bearer secret | `platform` | service name + explicit action allowlist | staff PDP; audited as `service:<name>` |
| **Super-admin (emergency)** | email + MFA | `platform` | wildcard role | staff PDP; every action reviewed weekly |

**Two hard rules that come from this model:**

1. **Staff RBAC and Patient/Caregiver access are different problems** with different
   threat models. They get different code paths. Do NOT unify them under one function.
2. **Service accounts are first-class identities**, not "skip auth because internal".
   The malware scanner is `service:malware-scan` with a 2-action allowlist, audited.

---

## 3. The decision pipeline (PDP)

`can(actor, action, resource, context)` → `{ allow | deny, reason, trace }`.

It evaluates **small, pure, named rules in order**. Each returns allow / deny / pass.

```
authenticated? → knownAction? → identityClassMatches?
  → roleAllowsAction?          (matrix lookup — the single source of truth)
  → tenantBoundary? → caseScope? → licenseValid?
  → restrictedTierGate? → breakGlassToken? → twoPersonRule?
  → consentOverlay?
  → ALLOW
```

The PDP **does not write to the database** and **does not write audit** during the
call. It is deterministic and fast. New constraints become **new rules**, never edits
to one giant function.

This is the standard "ABAC over RBAC" model (same family as Cerbos, Oso, AWS IAM,
OPA). Not novel — deliberately conventional.

### Three pieces of the policy

- **Action catalog** — every named action + its discipline tag + its constraint flags
  (`requiresLicense`, `requiresCaseScope`, `requiresBreakGlass`, `requiresTwoPerson`,
  `phiExport`, `immutableAfterSign`).
- **Role matrix** — for each role, the allowlist of actions. **Deny by default.**
  Wildcards for `superadmin` only. Aliases (`operator`→`medical_ops`,
  `finance`→`admin`) resolved before lookup.
- **Rules** — each encodes one concern (license, case scope, restricted tier, etc.).

---

## 4. The audit pipeline (a SEPARATE concern)

The PDP **emits a decision event**; a separate writer persists it. Why separate:

1. **Latency isolation** — a slow audit write must never slow an auth decision.
2. **Reliability** — a failed audit write can retry / alert without blocking auth.

Event shape (canonical): `at`, `actor {kind,id,role,tenantId}`, `action`,
`resource {type,id,tenantId,patientId?}`, `decision`, `reason` (stable enum),
`trace` (rules that fired), `context {providedReason?, breakGlassTokenId?, ip?, ua?}`.

Persist: every **deny**, every **sensitive allow** (break-glass, restricted read,
PHI export, audit ops, permission change), every **mutation** (already covered by
`writeMedplumAuditMirror`). Routine reads: sampled/skipped.

Storage progression: Stage 1 = today's `AuditLog` table, formalized. Stage 2 =
partitioned/retained audit store (pre-SOC 2). Stage 3 = tamper-evident immutable
storage.

---

## 5. Tenant isolation (the hospital-partner story) — three walls

| Wall | Enforces | Status |
|---|---|---|
| **App layer** | PDP rejects `actor.tenant != resource.tenant`; scope filters add `WHERE tenantId` | partial — columns exist, no helper |
| **Database (Postgres RLS)** | even raw SQL cannot cross tenants | **not enabled — must add before hospital onboarding** |
| **FHIR (Medplum)** | one Project per tenant | today single project w/ tags; split when 2nd hospital lands |

Postgres RLS is the critical addition: even if a query forgets `WHERE tenantId`, the
database returns zero foreign-tenant rows. This is the safety net hospitals demand.

---

## 6. Policy storage progression

| Stage | Storage | When | Trigger to advance |
|---|---|---|---|
| **1** | TS catalog + matrix + markdown doc + CI lint | today → first hospital | — |
| **2** | Postgres tables + `/admin/compliance/permissions` UI, seeded from Stage 1 | first per-tenant policy request | a hospital says "our policy differs" |
| **3** | Policy engine (Cedar) | conditions too complex for tables (rare) | a deeply conditional rule |

Stage 1→2 is cheap: only the data source for `roleAllowsAction()` changes; the PDP/PEP
architecture is identical. Stage 2→3 is unlikely to be needed.

---

## 7. Implementation sequence (what we build, in order)

| # | Step | Deferable? |
|---|---|---|
| 1 | Consolidate catalog + matrix into ONE source (replace `rbac.ts` arrays + `role-scope.ts` + scattered checks) | No |
| 2 | Build the PDP as a pure function (no DB writes, no audit writes) | No |
| 3 | Build the PIP with per-request memoization (license + CareTeam + tenant) | No |
| 4 | Build the audit emitter as a separate concern | No |
| 5 | Add scope-filter helpers (`patientReadScope`, etc.) returning Prisma WHERE fragments | No |
| 6 | Add `middleware.ts` for edge gating of `/admin/*`, `/clinician/*`, `/partner/*`, `/api/internal/*` | No |
| 7 | Service-account identity — replace ad-hoc bypasses in cron + webhook + scanner | No |
| 8 | Refactor server actions to call the PDP — one feature module at a time (start with `admin-patient/actions.ts`, 3,592 LOC) | Incremental |
| 9 | Unify break-glass on `DestructiveApprovalToken`; remove restricted-access cookie | No |
| 10 | Enable Postgres RLS on the 11 tenant-bearing tables | No (careful migration) |
| 11 | RBAC test suite — every (role × action × resource type) | No |
| 12 | CI lint keeping matrix doc in sync with code | No |
| 13 | Migrate matrix to Postgres + admin UI | Yes — wait for trigger |
| 14 | Medplum: separate Project per tenant | Yes — 2nd hospital |
| 15 | Audit storage hardening (separate DB, hash chain, retention) | Yes — pre-SOC 2 |
| 16 | Policy engine migration (Cedar) | Yes — probably never |

Steps 1–12 are the Phase 0 + Phase 1 RBAC work. Steps 13–16 are roadmap.

---

## 8. Deliberately deferred (and why)

- **Policy engine (Cedar/OPA/Oso)** — adds a service to operate; the matrix + ABAC
  pattern covers 99% of healthcare rules.
- **Field-level masking** — no current use case; add at the data-loader layer when one appears.
- **Time-bound / delegated permissions** — no on-call or locum patterns yet.
- **Hash-chain tamper-evident audit** — defer to SOC 2 Type II scope.
- **Anomaly detection** — needs months of audit history first.
- **Per-user Medplum AccessPolicy** — precluded by the service-account-only Medplum
  login; tenant-level segmentation is sufficient.
- **Federated SSO (OIDC)** — Phase 1 hospital work; RBAC accommodates it but does not build it.
- **Patient/caregiver portal under `can()`** — different threat model; keep `getOwnPatientRecord` separate.

---

## 9. Open decisions (need founder + senior dev sign-off before code)

1. **Postgres RLS before or after OVH migration?** Recommendation: **before** (migrating
   a validated-RLS system is safer than adding RLS mid-move).
2. **Edge middleware: strict 403 or soft warn?** Recommendation: strict for
   `/admin/*` + `/clinician/*`; defer `/partner/*` to tenant work.
3. **Service-account token rotation cadence?** Recommendation: 90 days with overlap.
4. **Compliance officer: one role or two?** Recommendation: one role, two flags
   (`isPrivacyOfficer`, `isSecurityOfficer`).
5. **Hospital SSO: OIDC or SAML first?** Need a call.
6. **Audit retention: 7 / 10 years?** Default 7 (HIPAA); make configurable per tenant.
7. **Break-glass weekly review owner?** Compliance officer vs medical director.

---

## 10. What this plan is NOT

Not in scope of RBAC (separate systems, don't conflate): feature flags, rate limiting,
encryption at rest/in transit, staff MFA, patient consent-management UI.

---

## 11. The destination, stated plainly

When steps 1–12 are done:

- One file answers "who can do what" (the matrix).
- One function makes every decision (the PDP).
- Every server action, route, and loader calls it — nothing decides for itself.
- Every deny and every sensitive allow is in the audit log with a reason.
- The database itself refuses cross-tenant reads (RLS).
- A test fails the build if anyone changes a permission by mistake.
- A compliance officer can read the matrix and verify it matches the regulation —
  without reading a line of TypeScript.

That is the bar. Everything below it is incremental, sequenced, and independently
shippable.

---

## 12. Phased roadmap & milestones

The 16 steps in §7 grouped into four phases, each with a single "done" test.
This is the schedule we actually build to.

### Phase 0 — Foundation (the spine) · *in progress*
The single source of truth + the decision function, proven on one real vertical.

| §7 step | Plain terms |
|---|---|
| 1. One matrix | A single file: "this role may do these named actions." Deny by default. |
| 2. Decision fn `can()` | One pure function every route/action asks. No DB / audit writes inside. |
| 3. Info fetcher (PIP) | Loads licence + care-team + tenant once per request. |
| 4. Audit emitter | Decision *emits* an event; a separate writer persists it. |
| 6. Edge role-gating | `proxy.ts` checks **role**, not just "is staff," per URL family. |
| 8a. Physio vertical | `/clinician/*` wired through `can()` as the reference implementation. |

**✅ Milestone:** *A physiotherapist can do only physiotherapist things, enforced
server-side, and a new action with a forgotten check fails closed — not open.*

### Phase 1 — Spread & harden · *next*
| §7 step | Plain terms |
|---|---|
| 5. Scope-filter helpers | Reusable "only my patients" / "only my tenant" query fragments. |
| 7. Service accounts | Cron, webhook, scanner become named identities with tiny allowlists. |
| 8b. Remaining modules | Every other role + `admin-patient/actions.ts` onto `can()`. |
| 9. Unify break-glass | One mechanism (`DestructiveApprovalToken`); delete the restricted-access cookie. |
| 11. Test suite | Every (role × action) combination tested. |
| 12. CI lint | Build fails if matrix code and the matrix doc drift apart. |

**✅ Milestone:** *Every role is behind the matrix, and the build itself blocks an
accidental permission change.*

### Phase 2 — Tenant isolation · *trigger: before 1st hospital goes live / OVH migration*
| §7 step | Plain terms |
|---|---|
| 10. Postgres RLS | The database refuses cross-tenant rows even if a query forgets the filter. |
| 14. Medplum per-tenant | Split the FHIR project when the 2nd hospital lands. |

**✅ Milestone:** *Even raw SQL cannot read another hospital's patients.*

### Phase 3 — Maturity · *trigger: only when needed, possibly never*
| §7 step | Trigger |
|---|---|
| 13. Matrix → DB + admin UI | A hospital says "our policy differs." |
| 15. Audit hardening (hash-chain, retention) | SOC 2 scope. |
| 16. Policy engine (Cedar) | A rule too conditional for the matrix — likely never. |

---

## 13. Phase 0 — what has shipped (2026-06-09)

The spine exists in code. Files (all heavily commented for non-specialist readers):

| File | Role |
|---|---|
| `src/lib/auth/policy/ehr-matrix.ts` | **THE READABLE GRID — single source of truth.** Each role × module → `hidden / read / write / sign` + scope + plain-English note. Encodes `EHR_ROLE_MATRIX.md` §3 (all roles, all modules). Heavily commented legend + `how to edit` for non-technical editors. Exposes `cellForRole`, `permissionsForRole` (the "everything this role can do" view), `meetsCapability`. |
| `src/lib/auth/policy/actions.ts` | Maps each named action → `{ module, requires, discipline?, requiresLicense?, requiresCaseScope? }`. Thin binding onto the grid. |
| `src/lib/auth/policy/matrix.ts` | `roleAllowsAction` / `rolesWithAction` — look an action up in the grid. No permissions live here; the grid owns them. |
| `src/lib/auth/policy/can.ts` | The pure decision function. Reuses `canSignClinical` + `isCaseScopedClinicalRole` from `rbac.ts` (no duplicated rules). |
| `src/lib/auth/policy/enforce.ts` | The gate (`requireStaffCan` / `staffCan`) that reads the session and calls `can()`. The only server-only file. |
| `src/lib/auth/policy/index.ts` | Clean import surface. |

**Physio vertical migrated onto it.** Every scattered `['physiotherapist','admin',
'superadmin']` literal in the `clinician-physio` feature and the `/clinician`
layout was removed; access now derives from the matrix action
`workspace.physio.access`. Touched: `app/clinician/layout.tsx`,
`clinician-physio/{actions,data}.ts`, `.../tasks/{actions,data}.ts`,
`.../patients/{actions,data}.ts`, `.../session-workspace/data.ts`,
`.../earnings/data.ts`.

**Still on the old path (deliberately — they remain fully enforced):** the 36 other
files using `getStaffUser([...])` + `canSignClinical`, chiefly
`admin-patient/actions.ts`. They migrate in Phase 1, one module at a time. We do
NOT rip out a scattered check before its `can()` replacement is wired — that would
open a hole.

**Step 6 — edge role-gating: SHIPPED (and hardened 2026-06-11).**
`src/lib/auth/route-access.ts` is the single Edge-safe source for "which roles may
enter each URL family". `src/proxy.ts` now enforces it: unauthenticated → staff
login; wrong role → bounced to that role's own home section (no redirect loops).
`admin-nav-policy.ts` was rewritten to derive nav visibility from the SAME source,
so the menu and the gate can never disagree. This closes the "any logged-in staff
can reach `/admin/insurance` / `/admin/compliance`" hole. Role sets mirror each
page/loader guard exactly.

**Deny-by-default at the edge (the fail-open fix).** `rolesForRoute()` previously
fell back to `ALL_STAFF_ROLES` for any unlisted `/admin/*` path — meaning a new page
shipped *without* a `ROUTE_RULES` entry was silently reachable by **every** staff
role (including `viewer`, `finance`, `hospital_partner_admin`). The only wall left
was the page's own `requireStaffCan`, so a page added without a guard was open to all
staff. Fixed: an unlisted staff route now returns an **empty role set** — no role may
enter — so a forgotten rule fails **closed**, not open. The two shared "front-door"
pages that every staff member legitimately needs (`/admin` dispatcher, the
`/admin/no-workspace` landing) are whitelisted as **exact-match** rules (`exact: true`)
so they stay reachable without becoming a wildcard that would re-open every child
route beneath them. Lookup order is: exact rule → longest prefix rule → deny.

**Per-role landing.** `homeRouteForRole()` maps every role to a section it is
guaranteed to be allowed into (physiotherapist → `/clinician/today`; nurse →
`/admin/nursing/dashboard`; insurance/finance → `/admin/insurance`; compliance →
`/admin/compliance`; roles with no workspace yet → `/admin/no-workspace`). `/admin`
itself is a dispatcher page that resolves the role and forwards there, so login,
"already signed in", and wrong-section redirects all funnel through one place with no
loops. Touched: `lib/auth/route-access.ts` (deny-by-default + exact rules),
`lib/auth/admin-nav-policy.ts` (active-state + descriptions), `app/admin/page.tsx`
(new dispatcher), `app/admin/no-workspace/page.tsx` (new landing),
`app/admin/AdminNav.tsx` (new client nav), `app/admin/layout.tsx`,
`app/clinician/layout.tsx`, and the login redirects in
`app/[locale]/auth/login/{page.tsx,LoginForm.tsx}`.

### Phase 0 remaining (not yet done)
- **Step 4 — audit emitter:** `can()` returns a `reason` + `trace` ready to log,
  but the separate async writer isn't built yet.
- **Step 3 — PIP for case scope:** `can()` accepts `inCaseScope`, but most physio
  writes still resolve scope inline (e.g. `withTrustedVisitFormData`). Centralise
  next.
- **Step 12 — `lint:rbac` + doc sync:** BLOCKED on a decision — see §15 below.

---

## 14. Findings flagged during Phase 0 (decide separately)

- **Baserow is not in this repo.** A full search found zero references. Whatever
  "feature-flag access control" exists is *outside* the application and can only
  hide/show UI — it is not a security control. Action item: confirm with the dev
  exactly what it gates (especially anything PHI-related); migrate any
  security-relevant flag into the matrix; keep Baserow only for editable content.
- **`canSignClinical` does not check licence expiry for the named clinical roles**
  (`doctor` / `nurse` / `physiotherapist`) — it only matches discipline. Expiry is
  enforced only for `medical_ops` / `operator` via `isLicensedMedOps`. This
  contradicts CLAUDE.md's claim that "expired licences cannot sign." Pre-existing;
  not changed in Phase 0. Decide whether expiry should hard-block the named roles.
- **The `scripts/` directory is missing from the repo.** `package.json` still
  declares `lint:rbac`, `lint:rbac:fix`, `test:security-policy`, `ehr:audit-gap`,
  and `ehr:audit-backfill`, all pointing at `scripts/*.ts|cjs` files that **do not
  exist** in the working tree. Running any of them fails. Either the directory was
  never committed or was removed. Action item: restore/author these scripts before
  wiring `lint:rbac` into CI (step 12), or strip the dead entries from
  `package.json`. Until then, treat "matrix ↔ doc drift" as a manual review.

---

## 14a. RBAC scripts & commands (current reality)

The npm scripts intended to support RBAC. **⚠️ marks ones whose backing file is
currently absent (`scripts/` directory missing) — they will fail until restored.**

| Command | Intent | State |
|---|---|---|
| `npm run lint:rbac` | Assert the code matrix matches `EHR_ROLE_MATRIX.md`; fail the build on drift (step 12). | ⚠️ file missing |
| `npm run lint:rbac:fix` | Regenerate the doc tables from the code matrix. | ⚠️ file missing |
| `npm run test:security-policy` | Self-test of the security/decision policy. | ⚠️ file missing |
| `npm run ehr:audit-gap` | Report operational Postgres mutations lacking an `AuditLog` row. | ⚠️ file missing |
| `npm run ehr:audit-backfill` | Backfill audit rows for historical mutations. | ⚠️ file missing |
| `npm run lint` | ESLint (`next/core-web-vitals` + TS). | ✅ works |
| `npm run build` | `prisma generate` + `next build` — the real type/route gate. | ✅ works |

**How RBAC is verified TODAY (until the scripts return):**
1. `npx tsc --noEmit` — the action catalog (`actions.ts`) is `satisfies
   Record<string, ActionDefinition>` and `ModuleKey` is a union, so a typo in a
   module name or action is a **compile error**.
2. `npm run build` — proves every page/route still type-checks and compiles.
3. Manual matrix review against `EHR_ROLE_MATRIX.md` §3 when a permission changes.

---

## 15. Open fork — representation of the matrix (needs a decision)

Two representations of "who can do what" now exist and must be reconciled before
`lint:rbac` (step 12) can be built:

1. **Module × role grid** (`ehr-matrix.ts`, built Phase 0) — ~37 modules, each role
   given `hidden/read/write/sign` + scope. Mirrors `EHR_ROLE_MATRIX.md` §3.
   Compact, non-technical-friendly, the current code source of truth.
2. **Flat 104-action × role table** (`EHR_ROLE_MATRIX.md` §22) — hand-written,
   marked "AUTO-GENERATED" but with no generator and no matching code. More
   granular (`patient.delete`, `note.nursing.amend`, `breakglass.approve`).

Recommended resolution: **keep the grid as the single human source**, and make
`lint:rbac` *derive* the granular action×role table (§22) FROM the grid — each
module expands into its `*.read / *.write / *.sign` rows by capability, plus a small
hand-listed set of cross-cutting actions (break-glass, two-person, feature-flag)
that aren't modules. This keeps one editable source and an auto-generated granular
view. Alternative: adopt the 104-action catalog as canonical and rebuild the code
around it (more granular, but a bigger catalog to hand-maintain).

Until this is decided, §22 stays hand-written and is NOT trusted as code-canonical.

---

*End of RBAC_ARCHITECTURE_PLAN.md*
