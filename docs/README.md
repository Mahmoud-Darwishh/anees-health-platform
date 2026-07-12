# Docs — Anees Health Platform

> **Audience:** anyone landing in this folder for the first time — owner, engineer, hospital partner, auditor.
> **Last refresh:** 2026-07-12.

This folder holds every long-form document for the platform. Read this README first; it tells you which doc to open for which question. If a link here is dead, that is a doc-hygiene bug — fix it.

---

## Where we stand in one paragraph

Anees is a production-grade bilingual (EN/AR) home-care platform serving Egypt today, with a signed hospital MOU and a planned MENA expansion. The clinical record lives in **Medplum (FHIR)**; operational + financial data is **Postgres + Prisma**; medical files live in **Cloudflare R2** behind authenticated streaming + malware scanning. The stack is **Next.js 16 + React 19 + TypeScript strict**, deployed on a self-hosted VPS (Hostinger today, OVH Bahrain in flight). Auth is **NextAuth v5** (patient credentials + WhatsApp OTP + Google OAuth + staff credentials, 45-minute sessions, with login + logout auditing). The platform ships four concurrent surfaces: a public marketing site, a bilingual patient portal at `/[locale]/portal`, an admin EHR + ops console at `/admin/*`, and a discipline-scoped clinician workspace at `/clinician/*` that now covers **physiotherapy, doctor, and nursing** field workflows. Multi-tenancy foundations, break-glass governance, an insurance + claims schema, license gating, a dual-store audit trail (Postgres `AuditLog` + FHIR `AuditEvent`), and a 23-state visit machine are all in place. Observability (Sentry) is installed and wired but DSN-inactive; telemedicine is groundwork only.

---

## Pick your starting point

| You are… | Start here | Then read |
|---|---|---|
| The **owner**, reading docs for the first time | **[root README](../README.md)** → this file → [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) (owner action list at the top) | [CTO_STRATEGY.md](CTO_STRATEGY.md) for the long view; [EHR_NOW.md](EHR_NOW.md) for the next 12 weeks. |
| A **new engineer** joining the team | [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) (engineering reference) → [EHR_SYSTEM_BLUEPRINT.md](EHR_SYSTEM_BLUEPRINT.md) → [FHIR_CATALOG.md](FHIR_CATALOG.md) → [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) | [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) for how PHI flows; [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) for the first deploy. |
| A **hospital procurement / IT** team | [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) → [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) → [FHIR_CATALOG.md](FHIR_CATALOG.md) | [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) for the IR procedure; [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) for the access model. |
| An **investor / advisor** | [CTO_STRATEGY.md](CTO_STRATEGY.md) (phases, hiring, risks) | [CTO_AUDIT_2026-07-01.md](CTO_AUDIT_2026-07-01.md) for an honest maturity read; [EHR_NOW.md](EHR_NOW.md) for execution credibility. |
| A **physiotherapist / doctor / nurse** or clinical lead | [EHR_SYSTEM_BLUEPRINT.md](EHR_SYSTEM_BLUEPRINT.md) (how the clinician workspace actually works) | [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) for cross-discipline access + workflow rules. |
| A **clinical / compliance officer** | [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) → [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) (audit + PHI controls). |
| A **security auditor** | [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) → [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | [CTO_AUDIT_2026-07-01.md](CTO_AUDIT_2026-07-01.md), [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md), [FHIR_CATALOG.md](FHIR_CATALOG.md), then code. |

---

## The full doc set

### Engineering reference

| Doc | What it answers |
|---|---|
| [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) | "What is the stack, what's where in the repo, what conventions must I follow, what pitfalls must I know?" The canonical engineering reference. Lives at `.claude/CLAUDE.md` (outside this folder) because Claude Code reads it automatically. |
| [EHR_SYSTEM_BLUEPRINT.md](EHR_SYSTEM_BLUEPRINT.md) | "How does the operational + clinical flow actually work today, end to end, and where is it going?" The canonical system-design doc of record — verified flow scan + defect register + target architecture + roadmap. |
| [FHIR_CATALOG.md](FHIR_CATALOG.md) | "Which FHIR resources do we use? Which module owns each one? What does the JSON look like? What are the Egyptian extensions?" Each resource carries an Implemented / Partial / Roadmap status. |
| [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) | "Who can read / write / sign what? How does case scope work? What's a break-glass override? How do field-ops state transitions behave?" The RBAC + business-logic system of record. |
| [RBAC_ARCHITECTURE_PLAN.md](RBAC_ARCHITECTURE_PLAN.md) | "What is the target authorization architecture — the layered PDP/PEP/PIP model, tenant isolation, and the sequence to get there?" The design authority behind the role matrix. |
| [EHR_AUDIT.md](EHR_AUDIT.md) | *(Historical, 2026-06-18.)* "Which clinical-core gaps were found and remediated in the June clinical-core hardening pass?" A frozen remediation ledger — not live status. For current status see the audit of record below. |

### Strategy & execution

| Doc | What it answers |
|---|---|
| [CTO_STRATEGY.md](CTO_STRATEGY.md) | "What's the 3-year plan? What phases? What's the hiring plan? What are the risks? What decisions were made and why?" The long view + append-only decision log. |
| [EHR_NOW.md](EHR_NOW.md) | "What are we doing this sprint, this quarter? Which sprints are done, which are in flight? What launch decisions has the owner locked?" The short view — kept ruthlessly current. |
| [SEO_AEO_GEO_AUDIT.md](SEO_AEO_GEO_AUDIT.md) | "What SEO / AEO / GEO / AI-search work is in place, what's missing, what's next on the marketing surface?" Strategy + running implementation log. |

### Compliance, security & operations

| Doc | What it answers |
|---|---|
| [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | "Where do we stand against HIPAA §164.308/310/312 and Egypt DPL 151/2020? What's a gap? What needs an outside lawyer? **What does the owner do this week?**" |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | "What's the defense-in-depth picture? Edge → Identity → Application → Data → Audit → Secrets → Vuln mgmt → Incident Response. Every control points to its code." |
| [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) | "How do we deploy? How do we rotate secrets? How do we restore from backup? What's the migration plan? What do we do at 3am when the site is on fire?" |

### Audits & quality

| Doc | What it answers |
|---|---|
| [CTO_AUDIT_2026-07-01.md](CTO_AUDIT_2026-07-01.md) | **The current audit of record.** "Are we secure, PHI-aware, HIPAA-ready, scalable, and well-architected — or drifting? What are the P0/P1 gaps and the do-not-launch-without list?" A dated, adversarially-verified due-diligence audit. |
| [PRODUCT_AUDIT_PROMPT.md](PRODUCT_AUDIT_PROMPT.md) | "How do we re-run a code-grounded product / business / medical audit?" The reusable prompt template that generates a new dated audit file. |

### AI-agent & contributor instructions

| Doc | What it answers |
|---|---|
| [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) | The canonical context every AI coding agent (and new engineer) must load first. |
| [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) | Thin, rules-only operating instructions for GitHub Copilot; defers all detail to `CLAUDE.md`. |

---

## Document conventions

- **All docs are markdown**, GitHub-flavored.
- **All docs cross-link** with relative paths so they work in the GitHub web UI, local previewers, and inside the repo. Links point only at files that exist.
- **All docs have a "Last refresh"** date at the top. If a doc lacks one, that's a doc-hygiene bug.
- **All docs name an audience** at the top.
- **Exact counts are avoided in prose** (they rot every sprint). Where a number matters, it is either approximate ("~35 modules") or generated in CI (like the role×action grid). The authoritative counts always live in code (`prisma/schema.prisma`, `package.json`, `src/`).
- **No PHI** appears in docs — every example is synthetic.
- **No secrets** appear in docs — env vars are described, not pasted.
- **No marketing fluff** — docs describe what *is*, what's planned, and what's a gap. Status markers are honest even when that means "partial" or "not built".

---

## How docs stay current

- **Owner / engineering writes a doc when:** a decision is made that future-them would re-litigate without it; an outside party will ask the question; a new system or surface lands.
- **Decisions go in [CTO_STRATEGY.md Decision Log](CTO_STRATEGY.md), append-only**, dated, with a short rationale.
- **Sprints update [EHR_NOW.md](EHR_NOW.md)** at sprint boundaries.
- **Compliance reviews update [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md)** quarterly.
- **A fresh dated audit** (via [PRODUCT_AUDIT_PROMPT.md](PRODUCT_AUDIT_PROMPT.md)) replaces the previous audit of record; the old one is deleted (git preserves history) or kept only if it holds unique provenance.
- **`.claude/CLAUDE.md` is refreshed after any material code change** — new module, new route, new schema model, new pitfall.

---

## What's missing (intentional gaps)

| Doc that does NOT yet exist | Why |
|---|---|
| OpenAPI / Swagger spec | The public API surface is small; server actions don't need it. Will add when we publish a hospital-partner API in Phase 1. |
| Mobile engineering brief | Mobile is months away. Will add when the Expo work starts. |
| FHIR StructureDefinitions / ValueSets | We use base FHIR + a few Egyptian extensions ([FHIR_CATALOG.md](FHIR_CATALOG.md)). Formal profiles only when a hospital partner needs them for HL7 conformance. |
| API.md (data contract for partners) | Will be created alongside the hospital-partner portal in Phase 1. |
| Incident post-mortems | Folder will be created on first incident: `docs/incidents/YYYY-MM-DD-slug.md`. |

---

## See also

- [Root `README.md`](../README.md) — the GitHub front door. Read this if you landed at the repo root.
- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — the engineering reference.
- [`prisma/schema.prisma`](../prisma/schema.prisma) — the authoritative DB schema.
- [`src/lib/medplum/`](../src/lib/medplum/) — the FHIR clinical modules (~35 files; ~22 own a resource).
