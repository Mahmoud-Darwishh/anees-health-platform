# Reusable Audit Prompt — DevOps + Product Manager lens

> **What this is:** a copy-paste prompt you run **any time** (e.g. before a release, or every few weeks) to get a fresh, code-grounded business/product/medical audit — the same idea as `docs/PRODUCT_LAUNCH_AUDIT.md`. It scans the actual code, re-checks every role journey and screen (what should show, what shouldn't, what to enhance), and writes a new dated audit file.
>
> **How to run:** paste everything in the box below into a new Claude Code chat in this repo. (Nothing else needed — the prompt is self-contained.)

---

```
ROLE: Act as a senior DevOps engineer + senior product manager + medical-operations lead reviewing a regulated, bilingual (EN/AR) home-healthcare platform (Next.js + Prisma/Postgres + Medplum/FHIR). Audience for your output is the NON-TECHNICAL owner: plain language first, with clickable file references for engineers.

GOAL: Produce a fresh, code-grounded PRODUCT + BUSINESS-LOGIC + MEDICAL audit — NOT a tech/code review. This is a re-run of a recurring audit, so it must DIFF against the previous one and the roadmap, and call out what changed, what's newly done, what regressed, and what to add/remove/enhance next.

HARD RULES:
- VERIFY, don't assume. Read the actual code before asserting any status. CLAUDE.md and docs may lag the code — trust the code.
- This is an AUDIT ONLY. Do NOT change code, run migrations, or build. Read-only.
- Constraint awareness: local DATABASE_URL points at the SHARED PRODUCTION database (never propose running migrations from dev); admin (/admin/*) + clinician (/clinician/*) are English-only by design; the public site + patient portal are bilingual; no cash — prepayment only (gateway + InstaPay); launch coverage = Greater Cairo (Cairo + Giza).
- Score everything against the three business lines: B1 = direct home care (cash-free, Greater Cairo, 3 disciplines), B2 = hospital partnerships/referrals (deferred), B3 = white-label (deferred). Anything serving none of them is a candidate to cut/park.

WHAT TO SCAN (read these, then follow the threads):
- Auth & signup: src/auth.ts, src/app/[locale]/auth/*, src/app/admin/login, src/app/admin/set-password, src/app/api/auth/*
- RBAC: src/lib/auth/policy/ (ehr-matrix.ts, actions.ts, can.ts, enforce.ts), src/lib/auth/route-access.ts, src/lib/auth/admin-nav-policy.ts, src/lib/auth/rbac.ts
- Surfaces & journeys: src/app/admin/* , src/app/clinician/* , src/app/[locale]/portal/* , src/features/* (admin, ehr, portal, booking, admin/billing, admin/ops, admin/analytics, admin/staff, admin/profile-requests)
- Money loop: src/app/api/bookings/*, src/lib/billing/*, src/lib/config/coverage-area.ts, prisma/schema.prisma (OnlineBooking, Visit, Invoice, Payment, Refund)
- Clinical safety: src/lib/security/malware-scan.ts, src/lib/config/production-readiness.ts, src/instrumentation*.ts, src/lib/utils/observability.ts, restricted-tier + license-gate (src/features/ehr/admin-patient/actions/*, tests/unit/*)
- Prior audit + roadmap: docs/PRODUCT_LAUNCH_AUDIT.md, docs/EHR_ROLE_MATRIX.md, docs/EHR_NOW.md, docs/CTO_STRATEGY.md, docs/EHR_AUDIT.md, and the memory file under .claude/projects/.../memory/ if present.

EVALUATE THESE DIMENSIONS (the heart of the audit):
1. Sign-in / sign-up: is the front door coherent? One login or double login? Who can self-register and how (invite+claim vs open)? Staff vs patient separation. Password reset paths. Orphan-account risks.
2. First screen + navigation per ROLE: where does each role land after login, and is that landing a real, useful "first 10 seconds" screen or an empty/placeholder room? Flag any role whose home is a dead-end.
3. Role JOURNEYS — for every active role (patient, doctor, nurse, physiotherapist, medical-ops/case-manager, admin, superadmin, finance, compliance): describe the journey, what they SHOULD see vs not, the best usage, and their operational dashboard (earnings/financials, public profile, availability/scheduling). Flag missing or half-built journeys.
4. Charts vs Dashboards vs Portal — is the clinical chart, the aggregate dashboards, and the patient portal each in the right place and reached the right way (worklist → drill-down)? Flag misplacements.
5. Screens to ADD, REMOVE, or ENHANCE — concretely: what new screen/section is needed, what existing one is dead/confusing and should be cut or hidden behind a flag, what tab/field should or shouldn't be displayed for each role.
6. The money loop: Lead → quote/price → prepay (gateway + InstaPay confirm) → Patient/Case → invite → Visit → document → receipt → payout. Trace it end-to-end and flag every break or manual step.
7. Medical / clinical-logic integrity: license-gating on every clinical write, discipline boundaries, restricted-tier gating, soft-delete only, malware scan real in prod, audit coverage. State what is verified vs assumed.
8. Hospital integration (B2) + white-label (B3): honest state + what the minimum next step is. Note tenant-isolation risk.
9. What to CUT or PARK for the current launch scope.

OUTPUT:
- Write a NEW file: docs/PRODUCT_LAUNCH_AUDIT_<YYYY-MM-DD>.md (use today's date). Do NOT overwrite docs/PRODUCT_LAUNCH_AUDIT.md — keep history.
- Structure: (0) one-paragraph verdict; (1) WHAT CHANGED since the last audit (newly complete / regressed / newly recommended — a clear diff); (2) launch-readiness scorecard (per surface: 🟢/🟡/🔴 + blocker? yes/no); (3) role-by-role journeys with screens-to-add/remove/enhance; (4) the money loop trace; (5) clinical-safety status (verified vs assumed); (6) charts/dashboards/portal placement; (7) B2/B3 state; (8) prioritized roadmap + sprints (smallest launchable → largest); (9) open decisions only the owner can make.
- Plain language for the owner; mark each finding with a file link (path:line) so an engineer can act.
- End with a 5-line "if you only do three things next" summary.

Begin by scanning; then write the file. Do not implement anything.
```

---

### Notes for re-runs
- Each run produces a **new dated file** in `docs/`, so you build a history and can see drift over time. The very first detailed audit is `docs/PRODUCT_LAUNCH_AUDIT.md` (v1/v2).
- If you want the agent to also spin up subagents for a deeper sweep, add to the prompt: *"Use the Explore subagent to fan out across role journeys in parallel."* (only if you want the extra depth/cost.)
- This is intentionally **audit-only**. To act on findings, run a follow-up asking to implement a specific phase.
