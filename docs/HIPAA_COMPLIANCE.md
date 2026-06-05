# HIPAA & Egypt DPL Compliance Map — Anees Health Platform

> **Audience:** the owner, the compliance officer, hospital procurement, future auditors.
> **Last refresh:** 2026-06-05.
> **Plain-English summary:** we are *not yet* HIPAA-certified (no formal audit, no signed BAAs across every vendor) — and we don't have to be today because we operate in Egypt under DPL 151/2020. But every architectural decision is made *as if* HIPAA applies, because the hospital MOU and the planned MENA expansion will force the question soon. This document tells you exactly where we stand against the HIPAA Security Rule (§164.308 administrative, §164.310 physical, §164.312 technical safeguards), plus Egypt's DPL, and what's left to close.

---

## What to do exactly — owner actions

These are the items only the owner can do or commission. Each is doable in a week.

### This week

1. **Sign the Medplum Business Associate Addendum (BAA).** Medplum offers BAAs to paying customers — request it from your account manager. Until signed, treat Medplum as DPA-only (data processor). Tracked in §10 below.
2. **Request quotes from OVH Bahrain** for: a dedicated bare-metal host (4-8 cores, 32-64 GB RAM, NVMe RAID, snapshot backups) and a managed Postgres instance. The migration plan is in [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md).
3. **Brief the medical director on the break-glass workflow.** Show them `/admin/compliance` and the `DestructiveApprovalToken` flow. Agree on who can approve overrides and the SLA for review.
4. **Hire (or appoint) a Privacy Officer and Security Officer.** Under HIPAA these are two separate named roles; under Egypt DPL one DPO is sufficient. You can hold both initially, but the names must appear in your written policies.

### This month

5. **Engage an Egyptian law firm specialising in DPL 151/2020.** You need a templated DPA (Data Processing Agreement) for sub-processors, a privacy policy review, and a patient consent form review (Arabic + English).
6. **Commission a third-party penetration test** before the first hospital partner goes live. Local firms (e.g. Secureworks Egypt, NDC Lab) and international firms (Cure53, Trail of Bits) both work — budget USD 8-25k for an MVP scope.
7. **Decide on the malware-scanning vendor.** Today's dev mock must be replaced with a real engine before any new uploads from outside the team. Options: ClamAV (self-hosted, free, lower accuracy), Cloudflare Email Security / Area 1 (good fit because we already use Cloudflare), Bitdefender / Sophos (managed, paid).
8. **Approve the observability budget** (Sentry web + server + log retention). Approx USD 50–250/mo at our scale.

### Next quarter (engineering will do; you approve scope + budget)

9. Multi-tenant query-level enforcement and row-level security (Postgres RLS).
10. Sentry + log aggregator wired (Sprint 5 in EHR_NOW).
11. Automated dependency scanning (Renovate / Dependabot) + SAST in CI.
12. Encrypted backups with off-site retention (S3 Glacier or OVH cold storage).
13. Incident-response tabletop exercise with the medical director and lead engineer.

### Items that need outside help (third parties)

| Need | Who | When |
|---|---|---|
| Templated BAA / DPA | Egyptian law firm | This month |
| Pen test report | Security firm | Before hospital go-live |
| HIPAA-readiness gap assessment | US- or EU-based firm with healthcare experience | Pre-MENA expansion |
| ISO 27001 / SOC 2 lite gap assessment | Same | 12 months out |
| Cyber-liability insurance quote | Insurance broker (e.g. AIG, Chubb) | Before hospital go-live |
| Egypt DPL registration with the data-protection authority | DPO + law firm | This quarter |

---

## 1. Scope and limits

**What this document is:** a control-by-control mapping of the HIPAA Security Rule (45 CFR §164.308, §164.310, §164.312) and a parallel mapping for Egypt's Personal Data Protection Law (DPL 151/2020). For each control we list: what the rule requires, what we do today, where the code lives, and the gap.

**What this document is not:** a legal opinion, a substitute for a privacy notice, or a HIPAA certification. We design *to* HIPAA principles; we are not formally certified, and we will not claim to be until an audit confirms it.

**Jurisdiction reality:**
- Today: Egypt. Egypt DPL 151/2020 is the binding regulation. HIPAA does not apply because no US patients are seen.
- After hospital go-live in Cairo: Egypt DPL applies. HIPAA still does not apply.
- After MENA expansion (Saudi PDPL, UAE FDPL, etc.): each country's law applies. HIPAA still does not apply.
- **HIPAA becomes binding only when a US covered entity sends us PHI** — for example, an Egyptian-American patient whose US hospital shares their record with us. Designing to HIPAA today is forward-looking insurance.

---

## 2. Roles under HIPAA terminology

- **Covered Entity:** Anees, when a US-based healthcare provider or insurer sends us PHI.
- **Business Associate:** Anees, when a covered entity contracts us to handle PHI.
- **Sub-processors (our vendors):** Medplum, Cloudflare R2, Hostinger (→ OVH), Wapilot, Kashier, Daily.co (planned), Sentry (planned).

A signed Business Associate Agreement (BAA) is required between Anees and every sub-processor that touches PHI. The DPA/BAA status of each vendor is tracked in §10 below.

---

## 3. Administrative Safeguards (HIPAA §164.308)

| Standard | Implementation specification | Required / Addressable | What we do today | Where in code/docs | Gap |
|---|---|---|---|---|---|
| **Security Management Process** §164.308(a)(1) | Risk Analysis | Required | This document + the threat model in [SECURITY_ARCHITECTURE.md §1](SECURITY_ARCHITECTURE.md). Reviewed quarterly. | This doc | Quarterly review cadence not yet formalised. |
| | Risk Management | Required | Sprint-driven gap closure ([EHR_NOW.md](EHR_NOW.md)). | EHR_NOW.md | None major. |
| | Sanction Policy | Required | None written. | — | **Gap:** write a 1-page sanction policy (what happens when staff violate). |
| | Information System Activity Review | Required | `/admin/compliance` dashboard surfaces audit log; weekly review by compliance officer planned. | `src/app/admin/compliance/` | Weekly review cadence not yet operating. |
| **Assigned Security Responsibility** §164.308(a)(2) | Security Official | Required | Owner today; planned hire. | This doc | **Owner action #4.** |
| **Workforce Security** §164.308(a)(3) | Authorisation / Supervision | Addressable | RBAC + `getStaffUser([roles])`. New hires onboarded via admin. | `src/lib/auth/rbac.ts` | None major. |
| | Workforce Clearance | Addressable | Pre-employment checks for clinical staff (syndicate registration, identity). | HR process | Codify as written policy. |
| | Termination Procedures | Required | `Staff.status = inactive` revokes access. Sessions invalidate at JWT expiry; rotate `AUTH_SECRET` on high-risk terminations. | `src/auth.ts` | Add a termination checklist (off-board doc). |
| **Information Access Management** §164.308(a)(4) | Access Authorisation | Required | RBAC + case scope + consent + license gating. | `rbac.ts`, `admin-nav-policy.ts`, FHIR `Consent` | None major. |
| | Access Establishment / Modification | Required | Role change is an admin action; `AuditLog` row required. | Admin patient detail server actions | None major. |
| | Isolation of clearinghouse | Required | Not applicable (we are not a clearinghouse). | — | n/a |
| **Workforce Training** §164.308(a)(5) | Security Reminders | Addressable | None today. | — | **Gap:** quarterly security training email + acknowledgement. |
| | Protection from Malicious Software | Addressable | Upload malware scan (`malware-scan.ts`); MDM not in place for staff devices. | `src/lib/security/malware-scan.ts` | MDM / endpoint protection for staff devices. |
| | Log-in Monitoring | Addressable | Login + logout audit. Failed-login monitoring partial. | `src/auth.ts` | Alert on repeated failed logins (Sprint 5). |
| | Password Management | Required | bcrypt hashing, length/complexity enforced at registration. | `src/auth.ts`, register routes | Pwned-password check via HIBP API (backlog). |
| **Security Incident Procedures** §164.308(a)(6) | Response and Reporting | Required | [SECURITY_ARCHITECTURE.md §10](SECURITY_ARCHITECTURE.md) — IR one-pager. | That doc | Tabletop exercise not yet run. |
| **Contingency Plan** §164.308(a)(7) | Data Backup | Required | Nightly Postgres dumps; R2 versioning. | [DEPLOYMENT_RUNBOOK.md §7](DEPLOYMENT_RUNBOOK.md) | Off-site storage for backups not yet wired. |
| | Disaster Recovery | Required | Documented restore procedure. | DEPLOYMENT_RUNBOOK.md | Restore drill not yet executed. |
| | Emergency Mode Operation | Required | Read-only fallback documented (planned). | DEPLOYMENT_RUNBOOK.md | Not exercised. |
| | Testing and Revision | Required | Quarterly DR drill targeted post-OVH-migration. | DEPLOYMENT_RUNBOOK.md | Not yet running. |
| | Applications and Data Criticality | Required | All clinical resources are P0; finance is P1. | This doc | None major. |
| **Evaluation** §164.308(a)(8) | Periodic Evaluation | Required | Sprint-end reviews + pen test (planned). | EHR_NOW.md | Pen test not yet commissioned. |
| **Business Associate Contracts** §164.308(b)(1) | Written contract | Required | Tracked in §10. | This doc | **Gaps as listed.** |

---

## 4. Physical Safeguards (HIPAA §164.310)

We do not run a data centre — physical safeguards are inherited from our hosting providers. Anees-owned hardware is limited to staff laptops.

| Standard | What it requires | Where it lives today | Gap |
|---|---|---|---|
| **Facility Access Controls** §164.310(a)(1) | Limit physical access to systems. | Hostinger data centre (ISO 27001 certified). Future: OVH Bahrain (ISO 27001 / 27018 / 27701 + HDS certified). | None — covered by provider certifications. |
| **Workstation Use** §164.310(b) | Define proper workstation usage. | Staff laptops only; PHI access is browser-only, no local PHI storage. | Write a 1-page acceptable use policy. |
| **Workstation Security** §164.310(c) | Restrict workstation access. | Today: staff laptops have OS-level passwords. | Mandate FileVault/BitLocker disk encryption on all staff devices. Add MDM (planned). |
| **Device and Media Controls** §164.310(d)(1) | Govern receipt, removal, and disposal of media. | No removable media policy. PHI is never written to USB / SD / paper without an explicit override. | Write a 1-page media-control policy. |
| **Backup and Storage** | Backups before equipment moves. | Pre-migration backup is mandatory in DEPLOYMENT_RUNBOOK.md. | None. |

---

## 5. Technical Safeguards (HIPAA §164.312)

This is where our architecture maps tightest. Most controls are implemented in code.

| Standard | Implementation | What we do today | Where | Gap |
|---|---|---|---|---|
| **Access Control** §164.312(a)(1) | Unique User ID — Required | Every staff and patient has a unique `User` row. JWT carries `id`. | `src/auth.ts`, `prisma/schema.prisma` | None. |
| | Emergency Access — Required | `DestructiveApprovalToken` (break-glass) flow. | `prisma/schema.prisma`, `/admin/compliance` | UI flow partial. |
| | Automatic Logoff — Addressable | JWT expiry (24h). Idle-timeout-in-UI not enforced. | `src/auth.ts` | Add 30-min idle logout in admin/clinician shells. |
| | Encryption and Decryption — Addressable | TLS in transit; R2 server-side at rest; Postgres at-rest depends on host. | TLS + R2 + Postgres | Move to OVH managed Postgres for native at-rest encryption. |
| **Audit Controls** §164.312(b) | Hardware/software mechanisms to record activity. | Dual audit: FHIR `AuditEvent` + Postgres `AuditLog`. Login + logout + override + clinical writes covered. | `src/lib/medplum/audit.ts`, `src/auth.ts` | Postgres-only operational writes incomplete; `access_denied` not always emitted. |
| **Integrity** §164.312(c)(1) | Mechanism to authenticate ePHI. — Addressable | Soft delete only on clinical. `Composition` becomes immutable on sign. FHIR resource versioning is built-in. | Medplum versioning, `Patient.deletedAt` | Periodic integrity check (planned, low priority). |
| **Person or Entity Authentication** §164.312(d) | Verify identity. — Required | bcrypt passwords + WhatsApp OTP for patients. Google OAuth for self-signup. | `src/auth.ts`, OTP routes | 2FA for staff accounts (planned, Sprint 6). |
| **Transmission Security** §164.312(e)(1) | Integrity Controls — Addressable | TLS everywhere; HMAC on Kashier webhook. | `next.config.ts`, webhook route | None. |
| | Encryption — Addressable | TLS 1.2+ for all public endpoints; HTTPS for all vendor API calls. | Cloudflare + Next.js | None. |

---

## 6. Organisational requirements (§164.314)

Not directly applicable until we sign BAAs as a Business Associate. Templates needed:
- BAA template (we offer to customers when they need one).
- Sub-processor DPA template (we send to our vendors).

Both should be drafted by counsel — see Owner action #5.

---

## 7. Policies and Procedures (§164.316)

HIPAA requires written policies + 6-year retention. Today we have:
- This document.
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md).
- [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md).
- [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md).

Still needed (1-pagers each):
- Sanction policy.
- Workforce off-boarding / termination checklist.
- Acceptable Use of Workstations.
- Device + Media Control.
- Quarterly Training acknowledgement form.

All policies should carry an issue date + a review date + a named owner.

---

## 8. Egypt DPL 151/2020 mapping

Egypt's Personal Data Protection Law 151/2020 is the regulation that binds us today. It is broadly GDPR-shaped. Key obligations:

| DPL Article | Requirement | Status |
|---|---|---|
| **Art. 2** | Lawful basis for processing — consent, contract, legal obligation, vital interests, public interest, legitimate interest. | ✅ Patient consent captured on booking + portal terms acceptance. |
| **Art. 3** | Sensitive data (health) requires explicit consent + additional safeguards. | ✅ Health data is treated as sensitive. Explicit consent at booking. Restricted-tier flags for mental health / HIV / DV. |
| **Art. 5** | Data subject rights — access, rectification, erasure, restriction, portability, objection. | 🟡 Access + rectification supported via patient portal. Erasure = soft delete. Portability (export) UI not yet built. |
| **Art. 7** | Data Protection Officer (DPO) required for entities processing sensitive data at scale. | 🟡 **Owner action #4.** |
| **Art. 9** | Registration with the Data Protection Centre. | 🟡 **Owner action — quarterly task.** |
| **Art. 10** | Cross-border transfer requires explicit consent + Centre approval. | 🟡 Patient consent captured. Cross-border transfer to Cloudflare R2 / Medplum needs the DPL lawyer to bless. |
| **Art. 14** | Data Processing Agreement required with all processors. | 🟡 See §10 vendor table. |
| **Art. 20** | Breach notification — to data subjects + the Centre within 72 hours. | ✅ Procedure documented in [SECURITY_ARCHITECTURE.md §10](SECURITY_ARCHITECTURE.md). Not yet exercised. |
| **Art. 35-44** | Penalties — fines from EGP 100k to 5M, criminal liability for some breaches. | n/a — we comply. |

**Bottom line:** structurally we comply with most DPL obligations. The missing pieces are: named DPO, Centre registration, signed DPAs with cross-border processors, and a patient-data export UI.

---

## 9. Other regulations on the horizon

| Regulation | Region | When it matters |
|---|---|---|
| Saudi PDPL | Saudi Arabia | When we open Riyadh — DPL-shape, registration required. |
| UAE FDPL | UAE | When we open Dubai — DPL-shape, ADGM/DIFC have stricter overlays. |
| GDPR | EU | If we ever serve EU residents — currently no plan. |
| HIPAA | US | When we receive PHI from a US covered entity. |
| GAHAR | Egypt | Hospital accreditation; not directly binding on us but our hospital partner cares. |
| MoH licensing (Egypt) | Egypt | Already in place via partner clinics. |

---

## 10. Vendor BAA / DPA checklist

Every vendor that touches PHI needs either a BAA (HIPAA) or a DPA (DPL/GDPR), depending on jurisdiction. Today we operate under DPL — so DPA is the binding instrument; we are gathering BAAs in parallel for the future.

| Vendor | Touches PHI? | DPA signed | BAA signed | Action |
|---|---|---|---|---|
| **Medplum** (clinical data) | Yes — full clinical record | 🟡 Standard ToS + need an Anees-specific DPA | ❌ **BAA available on paid plans** | **Owner action #1.** |
| **Cloudflare R2** (file bytes) | Yes — medical document bytes | 🟡 Cloudflare DPA exists; sign during account setup | ❌ Cloudflare offers BAA on Enterprise plans only | Confirm DPA acceptance in Cloudflare dashboard; defer BAA until needed. |
| **Hostinger** (VPS, today) | Yes — DB + app + Medplum host | 🟡 Hostinger DPA exists in ToS | ❌ Not BAA-capable | **Migration to OVH is the answer** — no need to sign with Hostinger long-term. |
| **OVH Bahrain** (planned) | Yes — same as Hostinger | 🟡 OVH offers DPA + HDS certification for healthcare | ❌ Not BAA-capable for non-US data, but HDS is sufficient under DPL | Sign DPA during contracting. |
| **Wapilot** (WhatsApp OTP) | No (no PHI in OTP body) | 🟡 ToS only | ❌ n/a | Verify ToS and check no PHI is ever sent. |
| **Kashier** (payments) | No (booking/financial data only) | 🟡 ToS / PCI-DSS responsibility flow | ❌ n/a | Confirm PCI-DSS attestation. |
| **Google OAuth** (sign-in) | No (only email + name) | 🟡 Google Cloud DPA | ❌ n/a | None — covered. |
| **Daily.co** (planned, telemed video) | **Yes** — video + audio = PHI | ❌ Need DPA | ❌ **Daily offers BAA on paid plans** — sign before launch | Pre-launch action. |
| **Sentry** (planned, error tracking) | Possibly — error messages may leak PHI | ❌ Need DPA | ❌ Sentry offers BAA on Business plans | Configure PII scrubbing **and** sign BAA. |
| **Cloudflare DNS + WAF** (in use) | Yes — sees all PHI in transit | 🟡 Cloudflare DPA | ❌ Enterprise only | Defer BAA until US-customer onboarding. |
| **GitHub** (source code) | No | 🟡 Microsoft DPA | ❌ n/a | None. |
| **NPM / package registry** | No | n/a | n/a | None. |
| **Anees corporate Google Workspace** (email) | **Possibly** — if patient info is emailed | 🟡 Google DPA | ❌ Workspace Enterprise has BAA | **Stop emailing PHI** as policy; revisit if pattern emerges. |

---

## 11. Patient-facing documents (need legal review)

| Document | Status | Owner |
|---|---|---|
| Privacy Policy (EN + AR) | Draft live at `/en/privacy-policy` | Owner + DPL lawyer |
| Terms of Service (EN + AR) | Draft live at `/en/terms-and-conditions` | Owner + DPL lawyer |
| Caregiver consent form | Captured via portal; needs paper equivalent | Owner + Medical Director |
| Telemedicine consent (planned) | Not drafted | Owner + Daily.co + DPL lawyer |
| Data-subject access request (DSAR) procedure | Not drafted | DPO |

---

## 12. Audit log retention

- Postgres `AuditLog`: **indefinite**. Archival to cold storage after 2 years (planned, Phase 2).
- Medplum `AuditEvent`: indefinite (Medplum default).
- File access logs on the streaming endpoint: 90 days minimum (HIPAA), structured by `AuditLog`.
- R2 server-side access logs: 30 days (R2 default).

---

## 13. Training plan (HIPAA §164.308(a)(5))

- New-hire: 1-hour briefing within first week. Topics: PHI definition, role boundaries, password hygiene, incident reporting.
- Annual refresher: 30-minute email-based course + acknowledgement.
- After every P0/P1 incident: targeted retraining for the affected team.

---

## 14. Quarterly review

This document is reviewed every quarter. Each review captures:
- New systems and whether they touch PHI.
- New regulations.
- Status of every gap listed above.
- Closed gaps move to the changelog at the bottom.

| Quarter | Reviewer | Date | Notes |
|---|---|---|---|
| Q2 2026 | (Owner) | 2026-06-05 | Initial version. |

---

## See also

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) — defense-in-depth layers.
- [FHIR_CATALOG.md](FHIR_CATALOG.md) — resource-level handling and RBAC.
- [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) — role × module permissions.
- [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) — secrets, backups, IR procedure.
- [CTO_STRATEGY.md](CTO_STRATEGY.md) — compliance roadmap (§15) and phased plan.
- [EHR_NOW.md](EHR_NOW.md) — current-sprint work for closing gaps.
