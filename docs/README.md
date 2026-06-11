# Docs — Anees Health Platform

> **Audience:** anyone landing in this folder for the first time — owner, engineer, hospital partner, auditor.
> **Last refresh:** 2026-06-05.

This folder holds every long-form document for the platform. Read this README first; it tells you which doc to open for which question.

---

## Where we stand in one paragraph

Anees is a production-grade bilingual (EN/AR) home-care platform serving Egypt today, with a signed hospital MOU and a planned MENA expansion. The clinical data layer is **Medplum (FHIR)**; operational + financial data is **Postgres + Prisma**; medical files live in **Cloudflare R2** behind authenticated streaming + malware scanning. The stack is **Next.js 16 + React 19 + TypeScript strict**, deployed on a self-hosted VPS (Hostinger today, OVH Bahrain in flight). Auth is **NextAuth v5** with patient-credentials + WhatsApp OTP + Google OAuth + staff-credentials, with login + logout auditing. The platform now ships four concurrent surfaces: a public marketing site, a bilingual patient portal at `/[locale]/portal`, an admin EHR + ops console at `/admin/*` for back-office staff, and a discipline-scoped clinician workspace at `/clinician/*` (physiotherapy pilot). Multi-tenancy foundations landed (Phase 1A); break-glass governance, insurance + claims schema, license gating, and a 22-state visit machine all landed in the same window.

---

## Pick your starting point

| You are… | Start here | Then read |
|---|---|---|
| The **owner**, reading docs for the first time | **[root README](../README.md)** → this file → [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) (owner action list at the top) | [CTO_STRATEGY.md](CTO_STRATEGY.md) for the long view; [EHR_NOW.md](EHR_NOW.md) for the next 12 weeks. |
| A **new engineer** joining the team | [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) (engineering reference) → [FHIR_CATALOG.md](FHIR_CATALOG.md) → [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) | [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) for how PHI flows; [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) for the first deploy. |
| A **hospital procurement / IT** team | [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) → [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) → [FHIR_CATALOG.md](FHIR_CATALOG.md) | [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) for the IR procedure; [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) for the access model. |
| An **investor / advisor** | [CTO_STRATEGY.md](CTO_STRATEGY.md) (phases, hiring, risks) | [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) for compliance posture; [EHR_NOW.md](EHR_NOW.md) for execution credibility. |
| A **physiotherapist** or clinical lead | [EHR_PHYSIO_SPEC.md](EHR_PHYSIO_SPEC.md) (the canonical product spec) | [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) for cross-discipline rules. |
| A **clinical / compliance officer** | [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) → [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) §7 (audit). |
| A **security auditor** | [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) → [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md), [FHIR_CATALOG.md](FHIR_CATALOG.md), then code. |

---

## The full doc set

### Engineering reference

| Doc | What it answers |
|---|---|
| [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) | "What is the stack, what's where in the repo, what conventions must I follow, what pitfalls must I know?" The canonical engineering reference. Lives at `.claude/CLAUDE.md` (outside this folder) because Claude Code reads it automatically. |
| [FHIR_CATALOG.md](FHIR_CATALOG.md) | "Which FHIR resources do we use? Which module owns each one? What does the JSON look like? What are the Egyptian extensions?" |
| [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) | "Who can read / write / sign what? How does case scope work? What's a break-glass override? How do field-ops state transitions behave?" |
| [EHR_PHYSIO_SPEC.md](EHR_PHYSIO_SPEC.md) | "What is the physiotherapist workspace, end-to-end?" The deepest product spec we have. 80 KB; read the reading guide first. |

### Strategy & execution

| Doc | What it answers |
|---|---|
| [CTO_STRATEGY.md](CTO_STRATEGY.md) | "What's the 3-year plan? What phases? What's the hiring plan? What are the risks?" The long view. |
| [EHR_NOW.md](EHR_NOW.md) | "What are we doing this sprint, this quarter? Which sprints are done, which are in flight?" The short view. Kept ruthlessly current. |
| [SEO_GEO_STATUS.md](SEO_GEO_STATUS.md) | "What SEO / structured data is in place, what's missing, what's next on the marketing surface?" |

### Compliance, security & operations (NEW — Jun 2026)

| Doc | What it answers |
|---|---|
| [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | "Where do we stand against HIPAA §164.308/310/312 and Egypt DPL 151/2020? What's a gap? What needs an outside lawyer? **What does the owner do this week?**" |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | "What's the defense-in-depth picture? Edge → Identity → Application → Data → Audit → Secrets → Vuln mgmt → Incident Response. Every control points to its code." |
| [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) | "How do we deploy? How do we rotate secrets? How do we restore from backup? What's the migration plan? What do we do at 3am when the site is on fire?" |
| [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) | "What must an AI or new engineer know before answering or coding in this repo?" |
| [ARCHITECTURE_SECURITY_AUDIT.md](ARCHITECTURE_SECURITY_AUDIT.md) | "Are we secure, PHI-aware, HIPAA-ready, scalable, and well-architected, or are we drifting into spaghetti?" |

---

## Document conventions

- **All docs are markdown**, GitHub-flavored.
- **All docs cross-link** with relative paths so they work in GitHub web UI, local previewers, and inside the repo.
- **All docs have a "Last refresh"** date at the top. If a doc lacks one, that's a doc-hygiene bug.
- **All docs name an audience** at the top.
- **No PHI** appears in docs — every example is synthetic.
- **No secrets** appear in docs — env vars are described, not pasted.
- **No marketing fluff** — docs describe what is, what's planned, and what's a gap.

---

## How docs stay current

- **Owner / engineering writes a doc when:** a decision is made that future-them would re-litigate without it; an outside party will ask the question; a new system or surface lands.
- **Decisions go in [CTO_STRATEGY.md §17 Decision Log](CTO_STRATEGY.md), append-only**, dated, with a short rationale.
- **Sprints update [EHR_NOW.md](EHR_NOW.md)** at sprint boundaries.
- **Compliance reviews update [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) §14** quarterly.
- **`.claude/CLAUDE.md` is refreshed after any material code change** — new module, new route, new schema model, new pitfall.

---

## What's missing (intentional gaps)

| Doc that does NOT yet exist | Why |
|---|---|
| OpenAPI / Swagger spec | The public API surface is small; server actions don't need it. Will add when we publish a hospital-partner API in Phase 1. |
| Mobile engineering brief | Mobile is months away. Will add when the Expo work starts. |
| FHIR StructureDefinitions / ValueSets | We use base FHIR + a few Egyptian extensions ([FHIR_CATALOG.md](FHIR_CATALOG.md) §10). Formal profiles only when a hospital partner needs them for HL7 conformance. |
| API.md (data contract for partners) | Will be created alongside the hospital-partner portal in Phase 1. |
| Incident post-mortems | Folder will be created on first incident: `docs/incidents/YYYY-MM-DD-slug.md`. |

---

## See also

- [Root `README.md`](../README.md) — the GitHub front door. Read this if you landed at the repo root.
- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — the engineering reference.
- [`prisma/schema.prisma`](../prisma/schema.prisma) — the authoritative DB schema.
- [`src/lib/medplum/`](../src/lib/medplum/) — the 24 FHIR modules.
