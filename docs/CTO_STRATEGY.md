# Anees — CTO Strategy & Execution Plan

> The full strategy document for Anees Health Platform.
> Written from the perspective of a CTO + Business Consultant.
> Covers: business model, tech philosophy, architecture, phases, tools, hiring, compliance, risks, decisions.
> Audience: founder, future engineering hires, investors.
> Living document — update as decisions evolve.
>
> **Companion docs:**
> - `.claude/CLAUDE.md` — current codebase state (the reference)
> - `docs/EHR_NOW.md` — short-term sprint plan
>
> **State alignment:** A full codebase audit was performed. Phase 0 reflects what is **actually built** vs. what is **left to do** — not the original assumptions. The earlier draft of this document assumed many things were not yet implemented; in fact, NextAuth, Medplum integration, the admin EHR, the patient portal, audit infrastructure, and Prisma migrations were already shipped. Phase 0 was rewritten accordingly.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Business model & strategy](#2-business-model--strategy)
3. [3-year vision](#3-3-year-vision)
4. [Technology philosophy](#4-technology-philosophy)
5. [Architecture — the 3-layer model](#5-architecture--the-3-layer-model)
6. [Compliance posture](#6-compliance-posture)
7. [Full tech stack — what we run, and why](#7-full-tech-stack--what-we-run-and-why)
8. [Phase 0 — Foundations (Months 0–3)](#8-phase-0--foundations-months-03)
9. [Phase 1 — Hospital pilot (Months 3–6)](#9-phase-1--hospital-pilot-months-36)
10. [Phase 2 — Productize & investor-ready (Months 6–12)](#10-phase-2--productize--investor-ready-months-612)
11. [Phase 3 — Regional & insurance readiness (Months 12–18)](#11-phase-3--regional--insurance-readiness-months-1218)
12. [Phase 4 — Scale operations (Months 18–36)](#12-phase-4--scale-operations-months-1836)
13. [Mobile strategy](#13-mobile-strategy)
14. [Hiring plan](#14-hiring-plan)
15. [Compliance roadmap](#15-compliance-roadmap)
16. [Risks & mitigations](#16-risks--mitigations)
17. [Decision log](#17-decision-log)
18. [Glossary](#18-glossary)

---

## 1. Executive summary

Anees is an elite-tier MENA home care platform building three revenue streams in parallel:

1. **D2C home care services** — patients pay directly for doctor visits, physiotherapy, nursing care, and telemedicine.
2. **Hospital operations layer** — Anees becomes the home care arm for partner hospitals, handling post-discharge care, referrals, and home-based extension of hospital programs.
3. **Insurance-funded care** (future) — once the data and operating model mature, Anees integrates with private insurers as a network provider for home-based care.

**The product is the platform.** The competitive moat is not the brand or the marketing — it is the **FHIR-native clinical data layer**, the **multi-tenant operational platform**, and the **compliance posture** that allows Anees to be credible to patients, hospitals, insurers, and regulators across multiple MENA countries simultaneously.

**Core technology bet:** Medplum (FHIR) as the clinical source of truth, Postgres + Prisma for operational data, Next.js as the unified application layer, React Native (Expo) as the mobile surface, and a self-hosted Docker stack on a regional VPS (OVH Bahrain) for full data sovereignty and lean cost.

**The discipline:** lean and replaceable on the surface (websites, apps, marketing); strong and permanent at the core (clinical data, audit, identity, compliance).

---

## 2. Business model & strategy

### 2.1 Service lines

| Service line | Description | Primary buyer | Status |
|---|---|---|---|
| **Doctor home visits** | GP and specialist visits to the home | Patient (D2C) / Hospital partner / Insurer | Live (D2C) |
| **Nursing care** | IV therapy, wound care, post-op nursing | Patient / Hospital partner / Insurer | Live (D2C) |
| **Physiotherapy** | Rehabilitation, post-stroke, post-surgery PT | Patient / Insurer | Planned |
| **Telemedicine** | Video consultation, prescription, triage | Patient / Hospital / Insurer | Planned |
| **Post-discharge care programs** | Structured care plans for post-surgery, chronic, geriatric | Hospital partner | MOU signed |
| **Chronic disease management** | Ongoing care for diabetes, HTN, CHF | Patient / Insurer | Future |
| **Lab / diagnostic at home** | Blood draws, sample collection | Patient / Hospital | Future |

### 2.2 The three business models, side by side

| Dimension | D2C | Hospital operations | Insurance |
|---|---|---|---|
| Customer | Patient | Hospital | Insurer |
| Sales cycle | Days | 3–9 months | 9–18 months |
| Margin | Highest | Medium | Lower |
| Volume | Lowest | Medium | Highest |
| Cash conversion | Immediate | 30–60 days | 60–120 days |
| Defensibility | Brand | Operational SLA | Network + data |
| Risk | Customer acquisition cost | Single-customer concentration | Regulatory + claims |

**Why all three matter:** D2C generates immediate cash and brand. Hospital ops generate volume and credibility. Insurance generates scale and defensibility. Each de-risks the others. The technology platform must serve all three without rewrites.

### 2.3 Geographic strategy

- **Year 1:** Cairo, with expansion to Alexandria as operations stabilize.
- **Year 2:** Full Egypt national presence + first GCC market entry (most likely UAE for ease of business setup, possibly Saudi for market size).
- **Year 3:** 2–3 MENA countries operational, with at least one hospital partnership per country.

### 2.4 Brand positioning

**Elite-tier home care.** Premium service quality, premium experience, premium pricing. The brand stands for trust, professionalism, and discretion. The platform must look and feel premium across every touchpoint — patient app, clinician app, hospital portal, marketing site.

---

## 3. 3-year vision

| Metric | Year 1 | Year 2 | Year 3 (organic) | Year 3 (with hospital scale) |
|---|---|---|---|---|
| Active patients | 1,500–3,000 | 5,000–12,000 | 15,000–40,000 | 50,000–100,000 |
| Active clinicians | 50–100 | 150–300 | 400–800 | 800–1,500 |
| Visits/month | 200–500 | 1,000–3,000 | 3,000–8,000 | 8,000–20,000 |
| Countries | 1 (Egypt) | 1–2 | 2–3 | 2–3 |
| Hospital partnerships | 1 (MOU) | 2–3 | 5–8 | 5–8 |
| Insurance partnerships | 0 | 1 (pilot) | 2–3 (active) | 2–3 (active) |
| Team size | 8–15 | 25–40 | 60–100 | 100+ |
| Engineering team | 2–3 | 4–6 | 8–12 | 8–12 |

**Tech platform must scale to the upper bound without architectural rewrites.** Everything in this document is designed for the 100,000-patient, multi-country, multi-tenant scenario, even though we're starting at 3,000 patients in one city.

---

## 4. Technology philosophy

### 4.1 The principles (in priority order)

1. **Patient safety over speed.** Clinical correctness is non-negotiable. Performance, features, and timelines yield to safety.
2. **Compliance as architecture, not paperwork.** Audit trails, encryption, signed URLs, FHIR — built in from day one, not bolted on under pressure.
3. **Lean now, scalable later.** Use managed services and serverless where possible. Avoid premature complexity. Avoid Kubernetes, microservices, and other "enterprise patterns" until forced.
4. **Cheap and replaceable surfaces; strong and permanent core.** Frontend, apps, marketing pages can be rebuilt. Clinical data, audit logs, identity cannot.
5. **One language end-to-end.** TypeScript everywhere. Easier hiring, easier code review, easier moves between projects.
6. **Standards over custom.** FHIR for clinical, OAuth/OIDC for identity, S3 for files, OpenAPI for contracts. Avoid bespoke schemas wherever a standard exists.
7. **Multi-tenant from day one.** Every table that holds tenant-specific data has a `tenantId`. Every query is scoped. Adding hospital #2 should be a config change, not a database migration.
8. **Bilingual + RTL by default.** Every screen, every email, every notification works in Arabic and English from day one.
9. **Observable always.** No untraced errors. No silent failures. Logs, metrics, traces, and alerts are part of the definition of done.
10. **Reversible decisions are cheap; irreversible ones get a meeting.** Choose vendors that don't lock us in. FHIR data is portable. S3-compatible storage is portable. Custom integrations are not — minimize them.

### 4.2 Anti-patterns we explicitly reject

- **Microservices before Series B.** Splitting our 50k LOC into 12 services would kill us. One Next.js app + Medplum + Postgres covers everything until we're 8+ engineers.
- **Kubernetes for a small team.** It would absorb a full-time SRE we don't have. Docker Compose on a VPS is enough through Year 2.
- **Custom auth.** NextAuth v5. Period. No homegrown JWT plumbing.
- **Custom schemas for clinical data.** Medplum/FHIR for everything clinical. No "we'll model patients ourselves" temptation.
- **Vendor lock-in to AWS-specific services** (DynamoDB, SQS, Cognito) early. We may move to AWS in Tier 3 but want the option to choose. Use portable equivalents.
- **Mobile-first marketing site.** Marketing site stays Next.js web. Mobile apps are for logged-in product.
- **Real-time everything.** Most workflows do not need real-time. Adding WebSockets / SSE / Pusher is a cost; we add it only where measurably needed.
- **Premature performance optimization.** Until something is slow under real traffic, default to readable code.

---

## 5. Architecture — the 3-layer model

```
┌────────────────────────────────────────────────────────────────────┐
│                       SURFACE LAYER                                │
│        (lean, replaceable, multiple, branded per tenant)           │
│                                                                    │
│   • Marketing site (anees.health) — Next.js, SEO-first             │
│   • Patient mobile app — React Native (Expo), invite-only          │
│   • Clinician mobile app — React Native (Expo), offline-capable    │
│   • Hospital partner web portal — Next.js subroute                 │
│   • White-labeled patient apps per hospital tenant (Phase 3)       │
│   • Admin dashboard — Next.js subroute, Bootstrap-styled           │
└────────────────────────────────────────────────────────────────────┘
                                ↕  HTTPS / signed tokens
┌────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                              │
│            (Next.js Route Handlers — TypeScript)                   │
│                                                                    │
│   • Auth (NextAuth v5 + OTP + SSO for hospital partners)           │
│   • Business rules (pricing, scheduling, eligibility, routing)     │
│   • Audit logging (Prisma Client Extension — every write)          │
│   • Multi-tenancy enforcement (every request scoped to tenant)     │
│   • Payment provider abstraction (Kashier / HyperPay / insurance)  │
│   • Webhook outbox (events delivered to hospital systems)          │
│   • Background jobs (Trigger.dev or self-hosted BullMQ)            │
│   • File access (signed URL generation for R2)                     │
│   • i18n & content (EN/AR, RTL)                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↕               ↕
┌──────────────────────────────────┐   ┌──────────────────────────────┐
│   OPERATIONAL DATA               │   │   CLINICAL DATA              │
│   (Postgres + Prisma)            │   │   (Medplum — self-hosted)    │
│                                  │   │                              │
│   • Patient (demographics)       │   │   • Patient (FHIR profile)   │
│   • Family                       │   │   • Encounter                │
│   • Visit (scheduling)           │   │   • Observation (vitals)     │
│   • Invoice, Payment, Expense    │   │   • Condition (diagnoses)    │
│   • Provider, Shift              │   │   • MedicationRequest        │
│   • Hospital (tenant)            │   │   • AllergyIntolerance       │
│   • CarePlan (operational)       │   │   • CarePlan (clinical)      │
│   • AuditLog                     │   │   • DocumentReference        │
│   • RateLimit                    │   │   • Communication            │
│   • Staff + StaffRole            │   │   • Coverage (insurance)     │
│                                  │   │   • Claim (insurance)        │
└──────────────────────────────────┘   └──────────────────────────────┘
                                              ↕
                                  ┌──────────────────────────────┐
                                  │   FILE STORAGE               │
                                  │   (Cloudflare R2, S3-compat) │
                                  │                              │
                                  │   • Patient photos           │
                                  │   • Lab PDFs, scans          │
                                  │   • Signed consents          │
                                  │   • Prescription scans       │
                                  │   • Invoice PDFs             │
                                  │   • Postgres backups         │
                                  └──────────────────────────────┘
```

### 5.1 Why this architecture

- **Surface ≠ core.** We can rewrite the patient app three times without touching the clinical data. We can add a hospital portal in two weeks because the backend already serves the data.
- **Clinical data is FHIR.** Any insurer, any hospital, any regulator, any country — FHIR is the lingua franca. We are never "stuck" with a custom schema.
- **Operational data stays in Postgres.** Things like scheduling, payments, expenses are not clinical. FHIR is overkill for them. Prisma + Postgres is simpler and faster.
- **Multi-tenant is built in.** Every relevant row has `tenantId`. Hospital A's data is invisible to Hospital B by query construction, not by hope.
- **Files are separated.** Photos and PDFs live in R2, not on the VPS disk. Server failures don't lose files. Backups stay small. Storage scales infinitely.

### 5.2 Tenancy model

- **Tenant types:** `direct` (Anees own customers), `hospital` (partner hospital), `insurer` (future).
- **Resource scoping:** Every Patient, Visit, CarePlan, Provider, and Document belongs to exactly one tenant.
- **Cross-tenant visibility:** A patient referred from Hospital A to direct care can be linked across tenants via a `RelatedPerson` or merge process — explicit, audited, never automatic.
- **Branding:** Tenant has `displayName`, `logoUrl`, `primaryColor`, `supportPhone`, `serviceLines[]` — used by white-labeled apps.

### 5.3 Identity model

- **Patient identity:** Owned by Anees. Single account across all tenants the patient is associated with.
- **Clinician identity:** Owned by Anees (Anees employees) or by tenant (hospital staff using portal).
- **Tenant-staff identity:** Hospital partner staff log in via SSO (OIDC) tied to their corporate identity provider where possible. Falls back to email+password with MFA.
- **Patient login:** Phone OTP primary. Email/password secondary.

### 5.4 Data flow examples

**D2C visit booking:**
1. Patient app → POST `/api/v1/visits` → application layer
2. Validate (Zod) → check eligibility/coverage → create `Visit` in Postgres → create FHIR `Encounter` in Medplum → write `AuditLog` → enqueue notification job
3. Trigger.dev job sends SMS via Unifonic + push via Expo
4. Response to app: visit ID, scheduled time, confirmation

**Hospital post-discharge referral:**
1. Hospital portal → upload discharge summary PDF → application layer
2. Store PDF in R2 → create FHIR `DocumentReference` pointing to R2 URL → create `Patient` (if new) + `Encounter` referencing the source hospital → assign to care coordinator
3. Care coordinator schedules follow-up visit → same Visit creation flow as above
4. On visit completion, FHIR `Encounter` updated, structured note created, copy of summary sent back to hospital via webhook

**Insurance claim (future):**
1. Visit completed → application layer triggers claim generation
2. Build FHIR `Claim` resource from Encounter + CarePlan + pricing
3. Submit to insurer API (per-insurer adapter) → store claim status
4. On approval, generate Invoice in Postgres → mark Visit as billed
5. Audit trail captures every step

---

## 6. Compliance posture

### 6.1 Regulations we operate under

| Regulation | Jurisdiction | Status | Action |
|---|---|---|---|
| **Egypt DPL 151/2020** | Egypt | Mandatory | Architectural compliance from day one; legal review before scaling |
| **HIPAA-aligned design** | US (we don't operate there yet) | Best practice | Design to HIPAA principles. Formal cert only when serving US patients |
| **GDPR** | EU residents using us | Mandatory if any EU user | Use GDPR-compliant vendors, sign DPAs, export + delete rights |
| **UAE Federal Law 2/2019** | UAE | Required at UAE entry | Local entity, MoH registration, data residency |
| **Saudi PHI Law + NPHIES** | KSA | Required at KSA entry | NPHIES is FHIR-native — Medplum is the right foundation |
| **PCI-DSS** | Payment data | Avoided by tokenization | Never store raw card data — Kashier/HyperPay handle PCI |

### 6.2 The four pillars of our compliance design

1. **Identity & access** — every action is attributed to a verified user. Role-based access. MFA for staff. SSO for hospital partners.
2. **Audit** — every clinical write, every PHI read, every export, every login. Tamper-evident. Stored for minimum 7 years.
3. **Encryption** — TLS 1.3 in transit always. AES-256 at rest. Application-level encryption for the most sensitive PHI fields (national ID, etc.).
4. **Data minimization** — collect only what we need. PHI never appears in logs, error messages, or analytics events. Signed URLs expire quickly.

### 6.3 What "HIPAA-style" means for us in practice

Even though Egypt does not legally require HIPAA, we operate as if it applies. This means:

- Patient data never leaves authorized systems
- Every access is logged with user identity
- Vendor selection prefers BAA-eligible providers (so we can certify later without re-platforming)
- File access is via signed URLs, never public links
- Production access is restricted, MFA-required, audited
- Encryption keys are managed (Doppler / cloud KMS), not in code

This becomes our credibility story when selling to hospitals and (eventually) US-affiliated insurers.

---

## 7. Full tech stack — what we run, and why

### 7.1 Frontend & application

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Already chosen, React Server Components, edge-ready, unified front + back |
| Language | **TypeScript 5 strict** | Type safety end-to-end; one language for everyone |
| UI styling (web) | **SCSS modules + design tokens** | Already in place, no Tailwind |
| Component library | **None — custom** | Premium brand demands custom design |
| Internationalization | **next-intl** (web) + **i18next** (mobile) | Shared message JSON; RTL handling on both |
| Forms | **react-hook-form + Zod** | Industry standard; Zod schemas shared client + server |
| State (client) | **Zustand** | Lightweight; no Redux ceremony |
| Server cache | **TanStack Query** | Caching, retries, optimistic updates |
| Motion | **Custom Reveal + IntersectionObserver** | Already in place; respects reduced motion |

### 7.2 Mobile

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native)** | Fastest iOS + Android from one codebase; cloud builds; OTA updates |
| Navigation | **React Navigation** | Standard |
| Auth | **expo-auth-session** + JWT from NextAuth | Token-based, shared with web |
| Push notifications | **Expo Push → APNs + FCM** | Free, abstracts both platforms |
| Offline | **WatermelonDB** (or SQLite + custom sync) | Required for clinician app in low-signal environments |
| Camera/files | **expo-image-picker + expo-document-picker** | Standard |
| Maps | **react-native-maps** | Native, better UX than Leaflet on mobile |
| Build/release | **EAS Build + EAS Submit** | One command per platform |
| Distribution | **TestFlight (iOS) + Play Internal/Closed (Android)** | Private distribution to paying clients before public stores |

### 7.3 Backend & data

| Concern | Choice | Why |
|---|---|---|
| API layer | **Next.js Route Handlers** | Don't split until 8+ engineers; one repo, one language |
| Validation | **Zod** | Schemas shared client + server |
| Operational DB | **Postgres 15 (self-hosted)** | Open, portable, robust |
| ORM | **Prisma 5** | Already chosen; type-safe |
| Clinical DB | **Medplum (self-hosted on our VPS)** | FHIR-native; portable; insurer-ready |
| Cache / queues | **Redis 7** | Sessions, rate limits, BullMQ |
| Background jobs | **Trigger.dev** (managed) or **BullMQ** (self-hosted) | Start with BullMQ on our VPS; move to Trigger.dev only if needed |
| Auth | **NextAuth v5 (Auth.js)** | Industry standard, OIDC/SSO ready |
| File storage | **Cloudflare R2** (S3-compatible) | Free egress, cheap, fast everywhere |
| Search | **Postgres full-text** initially → **Meilisearch** (self-hosted) when needed | Avoid premature complexity |
| Migration | **Prisma Migrate** (versioned) | Replaces current `db:push` workflow |

### 7.4 Infrastructure

| Concern | Choice | Why |
|---|---|---|
| Compute | **OVH VPS Bahrain region** (Phase 0–2) → **AWS Bahrain `me-south-1`** (Phase 3+) | Low latency to Egypt + GCC; data residency; clear upgrade path |
| Containers | **Docker Compose** (Phase 0–2) → **AWS ECS / managed** (Phase 3+) | Simple; one server runs everything until forced to split |
| Reverse proxy | **Caddy** | Auto-HTTPS, simple config, free |
| DNS / CDN / DDoS | **Cloudflare** (free tier) | Free, world-class, fronts everything |
| Object storage | **Cloudflare R2** | Already covered |
| Secrets | **Doppler** or **Infisical** | Centralized secret management |
| CI/CD | **GitHub Actions** | Standard, free at our volume |
| Backups | **Automated daily pg_dump → R2** + OVH snapshot backups | Two independent backup paths |
| Monitoring (uptime) | **UptimeRobot** + **BetterStack** status page | Public status page builds trust |

### 7.5 Observability

| Concern | Choice | Why |
|---|---|---|
| Errors | **Sentry** (web + mobile + server) | Industry standard |
| Logs | **Axiom** or **BetterStack Logs** | Structured logs, searchable, cheap |
| Metrics | **Grafana Cloud free tier** | Visual dashboards; alerts |
| Tracing (later) | **OpenTelemetry → Grafana Tempo** | When complexity demands it |
| Product analytics | **PostHog** (self-host or cloud) | Privacy-friendly, EU-hosted option |

### 7.6 Communication & integrations

| Concern | Choice | Why |
|---|---|---|
| Transactional email | **Resend** | Modern API, generous free tier |
| SMS (OTP, alerts) | **Unifonic** (MENA-native) + Vonage as fallback | Better Egypt + GCC SMS delivery |
| Push notifications | **Expo Push** (APNs + FCM) | Free, abstracts both stores |
| Telemedicine video | **Daily.co** (primary) + Agora (fallback for weak networks) | HIPAA-eligible, embedded, brandable |
| Voice (future) | **Twilio Programmable Voice** | When call center is needed |
| Maps & routing | **Google Maps Platform** | Best coverage in MENA; required for clinician dispatch |
| Webhooks (outbound to hospitals) | **Svix** (managed) or custom outbox table | Reliable delivery, retry, signing |
| Calendar (clinician sync) | **Google Calendar API + Microsoft Graph** | When clinicians demand sync |

### 7.7 Payments

| Concern | Choice | Why |
|---|---|---|
| Egypt | **Kashier** | Already integrated; covers cards + Fawry |
| GCC (UAE, KSA, Bahrain) | **HyperPay** or **Tap Payments** | Local processor relationships |
| Insurance claims | **Per-insurer adapters** (custom integrations) | No standard yet in MENA |
| Subscriptions (future) | **Stripe** if cross-border; **HyperPay** locally | Reserved for chronic care subscriptions |
| Payouts to clinicians | **Bank transfer via local rails** (manual initially → automated via partner bank API) | Egypt: bank transfers; GCC: WPS |

### 7.8 Internal tooling

---

## 8. Phase 0 — Foundations (Months 0–3)

**Goal:** Close the remaining gaps in our current platform so it is genuinely hospital-credible and ready to onboard the MOU partner.

### 8.0 What's already done (audited)

These were originally planned for Phase 0; the audit found they are **already in production**:

- ✅ **NextAuth v5** with Prisma adapter (Google OAuth + patient credentials + staff credentials, JWT sessions)
- ✅ **WhatsApp OTP** via Wapilot (`api.wapilot.net`) — patient onboarding
- ✅ **Medplum FHIR** deeply integrated — 23 modules in `src/lib/medplum/`, covering Patient, Encounter, Observation, Condition, Allergy, Medication, MedicationAdministration, CarePlan, CareTeam, ClinicalNote (Composition with draft/sign), Task, Consent (caregiver scopes), DocumentReference + Binary, ServiceRequest + DiagnosticReport (labs), Communication, Appointment, Practitioner
- ✅ **Admin EHR** at `/admin/patients/[id]` — 30 server actions covering every clinical write path
- ✅ **Patient portal** at `/[locale]/portal` with tabbed workspace (overview, clinical, files, care, visits, vitals, notes, tasks), bilingual EN/AR, caregiver-consent-scoped
- ✅ **Nursing dashboard** + **escalations queue**
- ✅ **RBAC** with case-scoped roles
- ✅ **Prisma Migrate** workflow (3 migrations applied)
- ✅ **Zod** in EHR schemas
- ✅ **Document streaming** via `/api/ehr/documents/[id]` with auth + scope + consent enforcement
- ✅ **File storage** — handled by Medplum (FHIR Binary), not by our app
- ✅ **PWA** + VAPID push
- ✅ **Bilingual i18n** with full EN/AR coverage of portal + EHR + admin

### 8.1 What's actually left for Phase 0

| # | Workstream | Outcome | Owner |
|---|---|---|---|
| 1 | Migrate from **Hostinger → OVH VPS Bahrain** | Production runs on healthcare-credible infrastructure | DevOps / senior engineer |
| 2 | Configure **Medplum's own Binary storage backend → Cloudflare R2** (Medplum config, not app code) | File storage scales, off VPS disk | DevOps |
| 3 | **Close the Postgres audit gap** — enforce explicit per-action auditing (or a wired extension) for `User`, `Staff`, `Patient` demographics, `Invoice`, `Payment`, `OnlineBooking`, `Visit`, `CarePlan` | Every Postgres mutation auto-audits (Medplum writes already do) | Senior engineer |
| 4 | Emit **staff login audit event** (TODO in `src/auth.ts`) | Login activity traceable | Senior engineer |
| 5 | Wire **Sentry + Axiom + UptimeRobot + BetterStack status page** | Production visibility | Senior engineer |
| 6 | Update CSP in `next.config.ts` for Sentry + Daily.co (when added) | New third-parties don't break | Senior engineer |
| 7 | **Add multi-tenancy** — `Tenant` model + `tenantId` on `Patient`, `Visit`, `CarePlan`, `Invoice`, `OnlineBooking`, `Staff`, `NurseShiftAssignment`, backfill `anees` tenant | Hospital B2B becomes possible without retrofit | Senior engineer |
| 8 | Move **DNS + CDN to Cloudflare** | Free protection + caching; pre-req for R2 patterns | DevOps |
| 9 | Move all **secrets to Doppler** (or 1Password Secrets Automation) | No secrets in laptop `.env.local` for production | Senior engineer |
| 10 | Establish **staging environment** (second small OVH VPS) | New features land here before production | DevOps |
| 11 | Establish **automated daily Postgres + Medplum backup → R2** + monthly restore drill | Real disaster recovery | DevOps |
| 12 | Write **DR runbook** (1 page) | Anyone can rebuild from scratch in <2 hours | Senior engineer |
| 13 | **Cleanup**: keep dead-code/scaffolding cleanup continuous; ensure no `package.json` script points to missing files | Repo reflects reality | Senior engineer |
| 14 | Sign up **Apple Developer + Google Play** accounts (mobile is months away, but lead time is 3–6 weeks) | Long approval starts running | Founder |
| 15 | Sign up **Sentry, Cloudflare, R2** if not already | Foundational service accounts | Founder |

### 8.2 Definition of done for Phase 0

- Production migrated to OVH Bahrain; Hostinger decommissioned after 7-day rollback window
- Medplum Binary backend is R2-backed
- Audit gap script reports zero gaps for audited Postgres models
- 99.5% uptime measured over 14 consecutive days post-migration
- One successful end-to-end disaster recovery drill (drop staging, restore from backup, verify, document timing)
- Multi-tenancy schema applied; `anees` tenant backfilled; hospital tenant can be created via admin
- All dead code identified in the audit is either deleted or wired in
- Compliance one-pager exists describing our security posture (sufficient for hospital procurement first-pass)

### 8.3 Phase 0 stack snapshot (target state)

```
Compute:    OVH VPS Comfort, Bahrain region (production) + smaller OVH (staging)
Runtime:    Docker Compose (Medplum + Postgres 15 + Redis + Caddy + Next.js)
Files:      Cloudflare R2 (as Medplum's binary backend) + R2 for backups
DNS/CDN:    Cloudflare (free tier)
Auth:       NextAuth v5 (Google + patient creds + staff creds) — already live
OTP:        Wapilot (WhatsApp) — already live
Email:      Resend (to wire if not already)
Errors:     Sentry (web + server)
Logs:       Axiom or BetterStack Logs
Uptime:     UptimeRobot
Status:     BetterStack public status page
Secrets:    Doppler or 1Password Secrets Automation
Backups:    pg_dump + Medplum dump → R2 daily; OVH snapshots
```

---

## 9. Phase 1 — Hospital pilot (Months 3–6)

**Goal:** Make the MOU partnership genuinely successful. Use it as the template to sign hospitals #2 and #3.

### 9.1 Workstreams

| # | Workstream | Outcome |
|---|---|---|
| 1 | **Hospital partner web portal** (Next.js subroute, scoped to tenant) | Hospital sees referrals, outcomes, billing, audit |
| 2 | **FHIR API gateway** (Medplum + token auth) | Hospital HIS can integrate (read + write) |
| 3 | **Webhook outbox** (events to hospital systems) | Real-time notifications: visit completed, discharge summary received, claim filed |
| 4 | **Discharge summary import** (FHIR `DocumentReference`) | Accept PDFs and/or structured summaries from hospital |
| 5 | **SSO support (OIDC)** for hospital staff | Hospital staff log in with their corporate identity |
| 6 | **Unified mobile app pilot** (patient + clinician, role-routed; one codebase) | TestFlight + Play Internal Testing with 50 patients + 20 clinicians |
| 7 | **Telemedicine integration (Daily.co/100ms)** | Embedded video; brand stays Anees |
| 8 | **Care plan templates** for post-discharge, post-surgical, chronic | Standardized care quality; faster onboarding |
| 9 | **Clinician scheduling + routing** (basic) | Assign visits, optimize for travel time |
| 10 | **Compliance docs pack** | DPA template, security one-pager, audit log sample, vendor list |

### 9.2 Hospital partner portal — feature list

- Referral inbox (incoming + status)
- Patient discharge upload (PDF + structured)
- Live patient list (currently in our care, post-discharge)
- Outcome reports (visits completed, readmission rate, patient satisfaction)
- Invoicing + billing (what hospital owes us, what we owe hospital)
- Audit log (read-only view of who accessed which records)
- Webhook configuration (where to send events)
- Staff management (add/remove their staff who access the portal)

### 9.3 Mobile app — pilot scope (one app, role-routed)

**Patient flow:**
- Login (phone OTP)
- See upcoming visits
- See past visits + clinical summaries (read-only)
- See current care plan
- Pay outstanding invoices (Kashier)
- Push notifications (reminders, results, payments)
- Telemedicine call (when scheduled)
- Contact care team (WhatsApp deep link initially)
- EN/AR with RTL

**Clinician flow:**
- Login (email/password + MFA)
- Today's visits list
- Patient summary (allergies, meds, history)
- Capture vitals
- Write note (templated)
- Take photos → upload to R2
- Mark visit complete
- Offline mode (read + write, syncs when signal returns)
- Push notifications (new visit assigned, schedule change)

### 9.4 Definition of done for Phase 1

- Hospital partner uses the portal weekly without complaints
- ≥50 patients onboarded via hospital referral pathway
- ≥80% of referrals result in a completed visit within SLA (e.g., 48 hours)
- Mobile app used by ≥30 patients and ≥15 clinicians in TestFlight/Play
- Webhook delivery success rate ≥99%
- Zero PHI incidents in 90 days
- 2 additional hospitals in active sales conversations

---

## 10. Phase 2 — Productize & investor-ready (Months 6–12)

**Goal:** Prove repeatability. This is the phase where the Series A pitch comes together.

### 10.1 Workstreams

| # | Workstream | Outcome |
|---|---|---|
| 1 | **White-label config layer** (logo, color, name, services per tenant) | Sign hospitals #2 and #3 with branded apps |
| 2 | **Hospital BD dashboard** (sales pipeline, conversion, ops metrics) | Show repeatability to investors |
| 3 | **Self-serve hospital onboarding** (admin spins up a new tenant in 1 day) | Lean ops |
| 4 | **Payment provider abstraction** + HyperPay test integration | Architectural readiness for GCC |
| 5 | **Care plan templates expansion** — post-surgical, geriatric, post-natal, oncology, chronic | Higher service quality; faster patient onboarding |
| 6 | **Telemedicine v2** — prescribing, recording (with consent), structured notes | Telemed becomes a real product, not a demo |
| 7 | **Insurance research spike** — Egypt UPA, UAE Daman, Saudi NPHIES | Decision-ready brief for Series A |
| 8 | **Performance + scale audit** | Confidently quote SLAs to hospitals (99.9% uptime) |
| 9 | **Bilingual content ops** — all clinical notes templates, patient handouts, consent forms in EN/AR | Removes a hidden bottleneck |
| 10 | **Public marketing site refresh** (SEO + brand) | Lead-gen volume up |

### 10.2 White-label specifics

A tenant's config drives:
- App logo and splash screen
- Color palette (primary, accent)
- App name in stores (or simply branded sub-app within the main Anees app via deep link config)
- Supported service lines (some hospitals only buy nursing, not telemed)
- Pricing rules (hospital-specific rates)
- Outbound notifications (sender name, footer)
- Email/SMS templates (branded)

### 10.3 Definition of done for Phase 2

- 2–3 active hospital partners, each with branded patient experience
- Hospital onboarding measured: <5 working days from contract signature to first referral
- Mobile app stable on TestFlight + Play (crash rate <1%)
- 3,000+ active patients, 100+ active clinicians
- Insurance pilot signed for Phase 3
- Investor data room ready: tech architecture, compliance posture, unit economics

---

## 11. Phase 3 — Regional & insurance readiness (Months 12–18)

**Goal:** Enter first GCC market. Integrate first insurer. Graduate to enterprise infrastructure.

### 11.1 Workstreams

| # | Workstream | Outcome |
|---|---|---|
| 1 | **Multi-country architecture** — currency, payment provider, regulator, language per tenant | Launch in UAE or KSA |
| 2 | **First insurer integration** (Egypt UPA likely, or UAE Daman pilot) | Validate insurance revenue stream |
| 3 | **FHIR `Claim` + `Coverage` resource workflow** | Eligibility, pre-auth, claim submission |
| 4 | **Public app store launch** (graduate from TestFlight) | Brand presence |
| 5 | **SOC 2 Type I prep** (Vanta or Drata) | Required for serious enterprise hospital deals |
| 6 | **Data warehouse** (Tinybird or BigQuery) | Investor metrics, hospital reporting, AI-readiness |
| 7 | **Compliance documentation** — Egypt DPL, UAE Health Data Law, Saudi PHI/NPHIES | Legal readiness |
| 8 | **Infrastructure tier upgrade** — move production to AWS Bahrain (`me-south-1`) | Enterprise data residency |
| 9 | **MDM (Mobile Device Management)** for clinician phones | Wipe lost devices; enforce passcodes |
| 10 | **24/7 on-call rotation** | Real SLA capability |

### 11.2 Country entry checklist (per country)

- Legal entity established
- MoH / health authority registration
- Local medical director licensed in-country
- Local payment provider integrated
- Local SMS provider tested
- Translations reviewed by in-country speaker (regional Arabic varies)
- Data residency compliant (most GCC requires in-region hosting — AWS Bahrain solves this)
- Local clinical leadership hired
- Insurance landscape mapped

### 11.3 Definition of done for Phase 3

- Operating in 2 countries with full compliance documentation
- 1 active insurance partner with claims flowing through the platform
- AWS Bahrain production live with multi-AZ deployment
- 99.9% uptime measured over a quarter
- SOC 2 Type I report achieved
- Crash rate <0.5% on mobile apps

---

## 12. Phase 4 — Scale operations (Months 18–36)

**Goal:** Industrial-scale operations across MENA. Platform supports 100k+ patients, multiple insurers, multiple countries, full enterprise procurement.

### 12.1 Workstreams (selected)

- **Microservice extraction** — only for genuinely bottlenecked domains (e.g., claims processing as its own service)
- **Kubernetes adoption** — only if team is ≥8 engineers and complexity justifies
- **Real-time clinician dispatch** (where business demands it)
- **AI-assisted clinical documentation** (ambient scribe via Whisper + LLM with strict PHI controls)
- **Patient programs** (chronic disease management, post-natal, geriatric monthly subscription)
- **Pharmacy integration** (prescription fulfillment, delivery)
- **Lab integration** (sample collection, results back into FHIR)
- **Public APIs** for partners (other healthtechs building on Anees)
- **Multi-region active-active** (failover between AWS Bahrain and AWS Frankfurt or UAE)
- **SOC 2 Type II + ISO 27001**
- **HITRUST CSF** if pursuing US/multinational insurer deals

### 12.2 Definition of done for Phase 4

- Operating in 3+ countries
- 50,000+ active patients
- Multiple insurance partners contributing meaningful revenue
- Engineering team 8–12 people, organized by domain
- Platform has uptime SLA contracts with hospital and insurer customers
- Company is at Series B / strategic-acquisition readiness

---

## 13. Mobile strategy

### 13.1 The decision

**Build one unified app for now, role-routed after login.** Patient flow and clinician flow live in the same codebase, same store listing, same release pipeline. Save 30–40% of dev cost and accelerate time-to-pilot.

**Revisit the "split into two apps" decision when one of these happens:**
- The app exceeds 60MB and patient experience degrades
- A hospital partner demands a fully white-labeled patient app as a separate listing
- The clinician app's offline + clinical complexity makes the patient app slow to ship
- Mobile team grows past 4 engineers

### 13.2 Distribution strategy

| Stage | Distribution | Why |
|---|---|---|
| Phase 1 pilot | TestFlight (iOS) + Play Internal Testing (Android) | Private, fast iteration, no public exposure |
| Phase 2 limited release | Same + selected paying clients via invite link | Still controlled |
| Phase 3 public launch | App Store + Play Store full listings | Brand presence |
| Phase 3+ white label | Per-tenant private listings via TestFlight / Play Closed Testing | Hospital-branded apps |

### 13.3 Offline strategy (clinician)

- Local SQLite database (WatermelonDB)
- Sync engine pulls assigned visits + relevant patient data on login or interval
- All writes (notes, vitals, photos) queue locally and sync on connectivity
- Conflict resolution: server-wins for clinical reads; append-only for clinician writes (no overwrites)
- Photos compressed locally before upload to save bandwidth

### 13.4 OS support

- iOS 15+ (covers >95% of iPhones in MENA)
- Android 9+ (covers >90% of Androids in MENA)
- Tested on at least: latest iPhone, mid-range Android (Samsung A-series), low-end Android (Xiaomi Redmi)

---

## 14. Hiring plan

### 14.1 Sequence

| Hire | When | Critical because |
|---|---|---|
| **Senior full-stack engineer (TypeScript/Next.js)** | Now | Phase 0 + Phase 1 leadership |
| **Mobile engineer (React Native/Expo)** part-time → full | Month 3 | Mobile pilot |
| **Product designer (mobile + web, Arabic-aware)** | Month 2 | Spec → execution gap |
| **DevOps / SRE generalist** part-time → full | Month 6 | Phase 2 reliability |
| **Second full-stack engineer** | Month 6 | Velocity for Phase 2 features |
| **Medical informatics / clinical lead** part-time | Month 4 | Care plan design, clinical safety |
| **Compliance officer** part-time | Month 9 | Phase 3 prep |
| **Third + fourth engineer** | Month 12 | Phase 3 execution |
| **Engineering manager / tech lead** | Month 15 | When team hits 5 |
| **Data engineer** | Month 18 | Phase 3 warehouse + analytics |

### 14.2 What we don't hire

- Full-time DBA — Postgres + Medplum manage themselves at our scale
- Full-time security engineer — outsource pen tests; use managed compliance tools
- DevRel / community — we're B2B/D2C, not a developer tool
- Premature middle management — flat structure until 12+ engineers

### 14.3 Engineering culture

- **Pairing on clinical features.** No single engineer ships PHI-touching code alone.
- **Code review is mandatory.** Even for the founder/CTO.
- **Tests required for critical paths.** Not 100% coverage — required coverage for auth, billing, clinical writes, audit.
- **On-call rotation from Phase 2.** Engineers fix what they break. Builds quality reflexes.
- **Post-mortems are blameless.** Every incident produces a written learning.
- **One language end-to-end** — no polyglot temptation until forced.

---

## 15. Compliance roadmap

| Quarter | Action |
|---|---|
| Q1 | Egypt DPL compliance documentation. DPAs signed with all vendors. AuditLog wired. |
| Q2 | Compliance one-pager for hospital procurement. Security review by external Egyptian counsel. |
| Q3 | Annual penetration test (external firm). Remediate critical findings. |
| Q4 | Compliance documentation set for hospital sales: SOC 2 readiness, BAA template, incident response plan. |
| Year 2 Q1 | UAE Health Data Law compliance documentation if entering UAE. |
| Year 2 Q2 | Saudi NPHIES technical conformance if entering KSA. |
| Year 2 Q3 | SOC 2 Type I audit (Vanta or Drata-assisted). |
| Year 2 Q4 | First insurance partner compliance review. |
| Year 3 Q1 | SOC 2 Type II audit. |
| Year 3 Q2 | ISO 27001 if pursued by enterprise demand. |
| Year 3 Q3 | HITRUST CSF if pursuing US-affiliated insurance. |
| Year 3 Q4 | Annual review of all compliance certifications. |

---

## 16. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hospital MOU does not convert to revenue | Medium | High | Diversify with D2C; sign hospitals #2 and #3 early |
| Key engineer leaves | Medium | High | Pair programming; documentation; redundancy in critical knowledge |
| Data breach | Low | Existential | Cyber insurance; audit-first design; pen tests; least-privilege access |
| Regulator action (Egypt DPL) | Low | Medium | Compliant from day one; legal counsel on retainer |
| Vendor lock-in (Medplum, Vercel, etc.) | Low | Medium | Standards-based choices (FHIR, S3, OIDC); migration plans documented |
| Mobile app rejected by Apple/Google | Medium | Low | Private distribution buys 6+ months; technical compliance reviewed before submission |
| Insurance integration fails to convert | High | Medium | Pilot in Egypt first (UPA); validate before scaling investment |
| Postgres / Medplum scaling issues | Low | High | Capacity planning at each Phase boundary; ability to scale up before scaling out |
| GCC entry blocked by entity / licensing delays | Medium | Medium | Local advisors; start entity formation 6 months ahead of go-live |
| Founder bandwidth on tech decisions | High | Medium | This document. Quarterly tech review. Avoid solo decisions on irreversible choices |

---

## 17. Decision log

Decisions made and the rationale. **Append-only — do not edit past entries.** New decisions added as they happen.

| Date | Decision | Rationale |
|---|---|---|
| Initial | **Medplum (FHIR) as clinical source of truth** | Portability; insurer-ready; NPHIES-ready; avoids custom schema lock-in |
| Initial | **Next.js + Postgres + Prisma for operational platform** | Already in place; modern; lean |
| Initial | **TypeScript end-to-end** | One language; broader hiring pool; type safety |
| Initial | **NextAuth v5 for auth** | Industry standard; OIDC ready; no homegrown JWT |
| Initial | **Cloudflare R2 for files** | Free egress; S3-compatible (portable); cheap |
| Initial | **Self-host Medplum from day one** | Cost control; data sovereignty; long-term independence |
| Initial | **OVH Bahrain VPS for Phase 0–2** | Best Egypt latency; serious infra; clear upgrade path |
| Initial | **Expo (React Native) for mobile** | Fastest to cross-platform; OTA updates; managed builds |
| Initial | **One unified mobile app (role-routed) for Phase 1** | Lean; saves 30–40% cost; revisit at split triggers |
| Initial | **TestFlight + Play Internal Testing for Phase 1 distribution** | Private; fast iteration; no public store risk |
| Initial | **Daily.co for telemedicine** | HIPAA-eligible; embedded; developer-friendly |
| Initial | **Unifonic for SMS (Egypt/GCC)** | MENA-native; better delivery than global providers |
| Initial | **Multi-tenant data model from day one** | Hospital B2B is a primary business model; retrofitting tenancy is painful |
| Initial | **AuditLog via Prisma Client Extension** | Centralized; cannot be forgotten in individual mutations |
| Initial | **No microservices, no Kubernetes through Phase 2** | Lean; team is too small to operate |
| **Audit revision** | **Codebase audit performed** — Phase 0 rewritten | The actual state was significantly more advanced than the original CLAUDE.md described. NextAuth, Medplum (23 modules), admin EHR (30 server actions), patient portal (8-tab workspace), caregiver consent, document streaming, Prisma migrations, Zod — all already in production. Phase 0 narrowed to: Hostinger→OVH migration, close Postgres audit gap, observability, multi-tenancy, cleanup. |
| Post-audit | **WhatsApp OTP via Wapilot is the patient login** | Already implemented; replaces the originally-planned SMS provider for patient OTP. Unifonic stays as the fallback / B2B notification channel. |
| Post-audit | **File storage is Medplum-managed (FHIR Binary), not app-managed** | Local app-level storage abstraction was removed. R2 enters as Medplum's binary backend, not as an app-level abstraction. |
| Post-audit | **Caregivers use `/[locale]/portal` via FHIR Consent, not a separate app** | Legacy empty caregiver scaffolding was removed; keep using consent-scoped portal access unless a separate caregiver product is explicitly planned. |
| Post-audit | **Admin patient detail is a single 2,000-line page-view with 30 server actions** | Pattern to follow for future EHR surfaces: `features/<domain>/{actions.ts, data.ts, page-view.tsx, schemas/, types.ts}`. Big modules are fine when they reflect a single cohesive workflow. |

---

## 18. Glossary

| Term | Meaning |
|---|---|
| **FHIR** | Fast Healthcare Interoperability Resources — the global standard for clinical data exchange |
| **HL7** | Health Level Seven — organization that publishes FHIR |
| **PHI** | Protected Health Information — any data that identifies a patient and relates to their health |
| **HIPAA** | US Health Insurance Portability and Accountability Act — sets PHI handling rules |
| **GDPR** | EU General Data Protection Regulation — applies to any EU resident's data |
| **DPL** | Data Protection Law (Egypt Law 151/2020) |
| **NPHIES** | Saudi national platform for health information exchange and services — FHIR-based |
| **BAA** | Business Associate Agreement — required under HIPAA between covered entities and vendors handling PHI |
| **DPA** | Data Processing Agreement — required under GDPR |
| **EHR** | Electronic Health Record |
| **HIS** | Hospital Information System (the hospital's existing IT) |
| **SSO** | Single Sign-On |
| **OIDC** | OpenID Connect — modern SSO protocol |
| **MFA** | Multi-Factor Authentication |
| **PITR** | Point-in-Time Recovery (Postgres feature) |
| **R2 / S3** | Object storage services (Cloudflare / Amazon) |
| **VPS** | Virtual Private Server |
| **PWA** | Progressive Web App |
| **OTA** | Over-the-Air updates (mobile apps) |
| **APNs / FCM** | Apple Push Notification service / Firebase Cloud Messaging — push for iOS / Android |
| **SLA** | Service Level Agreement — uptime / performance guarantees |
| **SOC 2** | Security audit standard (Type I = point in time, Type II = period of time) |
| **ISO 27001** | International information security management standard |
| **HITRUST** | Healthcare-focused security framework (US) |
| **Tenant** | A logical customer environment (a hospital partner, an insurer, or Anees-direct) |
| **White-label** | A version of the app branded as a partner's product, running on our platform |
| **D2C** | Direct-to-consumer (patient pays Anees directly) |
| **B2B / B2B2C** | Business to business / Business to business to consumer (we sell to hospital, hospital serves patient) |

---

## Closing

This document is a north star, not a contract. Strategy evolves. Phases overlap. Priorities shift when reality hits.

**What does not change:**

1. **Patient safety first.** Always.
2. **Clinical data is FHIR.** Always.
3. **Compliance is architecture.** Always.
4. **Lean now, scalable later.** Always.

When in doubt, return to those four. Everything else is negotiable.

— End of document —
