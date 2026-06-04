# EHR — What To Do Now

> Short-term execution plan, based on the **actual state of the codebase** (audited).
> Companion to `CTO_STRATEGY.md` and `.claude/CLAUDE.md` — those are the long view and the reference; this one is **what we do this week, this sprint, this quarter**.
> Horizon: **next 12 weeks (6 sprints × 2 weeks)**.

---

## Reality check — what's already done

Before planning the next sprint, this is what already exists in the repo (so we don't rebuild it):

✅ **NextAuth v5** installed and live (Google + patient creds + staff creds + JWT sessions + RBAC)
✅ **WhatsApp OTP** via Wapilot (send + verify)
✅ **Medplum FHIR fully integrated** — 23 modules, patient sync, all major clinical resources
✅ **Admin patient EHR detail page** with 30 server actions (visits, vitals, notes draft/sign, care team, tasks, conditions, allergies, meds, med-admins, labs, docs, escalations, nursing handoffs, geo-policy, caregiver consent, demographics)
✅ **Patient portal** at `/[locale]/portal` with tabbed workspace (overview, clinical, files, care, visits, vitals, notes, tasks) — bilingual, caregiver-consent-scoped
✅ **Nursing dashboard** + **escalations queue**
✅ **Document streaming** with auth + case-scope + consent enforcement
✅ **Patient ↔ Medplum** identity link (`Patient.medplumPatientId`, `Staff.medplumPractitionerId`)
✅ **Prisma Migrate** workflow (not `db:push`)
✅ **Zod** in EHR schemas
✅ **PWA** + VAPID push

The earlier draft of this file proposed building most of the above — that was wrong. The real gaps are smaller, more specific, and listed below.

---

## The one-line goal

> **In 12 weeks: migrate off Hostinger to OVH Bahrain, close the audit gap, wire observability, add multi-tenancy, ship telemedicine, and stand up a hospital-partner portal stub — so the MOU hospital can start using the platform and we can credibly pitch hospital #2.**

That is the only goal. Everything below serves it.

---

## Guiding rules for this quarter

1. **Stop building before fixing.** Don't ship new features on Hostinger. Get to OVH first.
2. **Close the Postgres audit gap.** Every clinical mutation in Medplum is audited; many Postgres mutations are not. This must be fixed before any hospital sees the platform.
3. **No multi-tenancy retrofit later.** Add `tenantId` now while we have one tenant.
4. **One sprint = one demo.** No "infrastructure sprints" with nothing to show. Even Sprint 0 (migration) ends with the founder confirming `/portal` works on the new server.
5. **Delete dead code as you touch it.** Keep the repo aligned to reality; remove stale scaffolding and broken script references as soon as discovered.
6. **Caregiver app is not a separate app.** Caregivers use `/portal` via Consent. The empty `/caregiver/*` folders should be deleted unless we make a deliberate, costed decision to build a separate surface.
7. **Hospital portal is the unlock.** The MOU is signed. Build to make that hospital successful — not to chase generic features.

---

## Sprint 0 — Migrate off Hostinger (Week 0, before sprints start)

**Length:** 1 week. **Purpose:** get production onto credible infrastructure.

### Founder tasks
- [ ] Sign up: OVH Cloud, Cloudflare, Sentry, Doppler (or 1Password)
- [ ] Order OVH VPS Comfort, Bahrain region (BHS / Manama) + automated backups
- [ ] Apply for Apple Developer + Google Play Console (long lead time — start now even though mobile is months away)
- [ ] If domain DNS isn't already at Cloudflare, move it there

### Engineer tasks
- [ ] Provision OVH VPS, install Docker
- [ ] Stand up Docker Compose for: Postgres 15 + Redis + Caddy + Medplum + Next.js
- [ ] Configure Medplum's **own** binary storage backend (S3-compatible — Cloudflare R2 is the recommended target). This is a Medplum config, **not** code we write in this app.
- [ ] `pg_dump` from Hostinger Postgres → restore on OVH
- [ ] Snapshot Medplum data on Hostinger → restore on OVH (Medplum disaster recovery procedure)
- [ ] Update DNS via Cloudflare to point to OVH
- [ ] Add Sentry to the Next.js app (web + server)
- [ ] Update `next.config.ts` CSP to allow Sentry endpoints
- [ ] Set up automated daily Postgres backup → R2 (script)
- [ ] Set up daily Medplum backup → R2
- [ ] UptimeRobot monitors for: marketing site, `/portal`, `/admin/patients`, `/api/medplum/health`
- [ ] Set up staging VPS (smaller OVH instance) — same Docker Compose
- [ ] Verify `/portal`, `/admin/patients/[id]`, document upload, vitals capture, note signing all work end-to-end on the new server
- [ ] Keep Hostinger running for 7 days as rollback
- [ ] Cancel Hostinger after the rollback window closes

### Sprint 0 — Definition of done
- Production runs on OVH Bahrain, not Hostinger
- Patient portal and admin EHR work identically to before, on the new server
- Sentry receives errors
- UptimeRobot pings every minute
- Daily Postgres + Medplum backups land in R2
- Engineer has clear backlog for Sprint 1

---

## Sprint 1 — Audit gap + secrets + cleanup (Weeks 1–2)

**Compliance and hygiene. Boring. Required.**

### Backend
- [ ] **Close Postgres mutation auditing with explicit writes** (`prisma.auditLog.create()` or a wired extension) across `Patient`, `OnlineBooking`, `Visit`, `CarePlan`, `Invoice`, `Payment`, `Staff`, and `User` mutations. Document the chosen pattern.
- [ ] Add **staff login audit event** in `src/auth.ts` (`staff-credentials.authorize` callback — see the TODO comment).
- [ ] Audit drill: write a script that lists "tables with mutations in the last 7 days" vs "tables with AuditLog rows in the last 7 days." Gap should be zero for audited models.
- [ ] Move all secrets from `.env.local` (on each engineer's laptop) to **Doppler** or **1Password Secrets Automation**. App reads from there in production. No secrets in repo, no secrets in chat.
- [x] Remove stale/missing `scripts/*` references from `package.json` scripts.
- [x] Delete nested duplicate `anees-health-platform/anees-health-platform/` folder.
- [x] Delete dead local storage abstraction (`src/lib/storage/file-storage.ts`) now that file storage is Medplum-managed.
- [x] Delete empty caregiver and portal scaffolding folders.

### Sprint 1 — Definition of done
- Every Postgres mutation to an audited model produces an `AuditLog` row, verified by an audit-gap script
- Staff login + logout emit audit events
- No secrets remain in any engineer's `.env.local` (production reads from Doppler / 1Password)
- Repo has no dead code with the labels above
- `npm run db:migrate:status` and all `package.json` scripts execute successfully (or are removed)

---

## Sprint 2 — Multi-tenancy foundation (Weeks 3–4)

**Add tenant scoping before we have multiple tenants. Once we have two, retrofit is painful.**

### Backend
- [ ] Add `Tenant` model to schema:
  ```
  model Tenant {
    id            String   @id @default(cuid())
    code          String   @unique   // "anees", "hospital-x"
    displayName   String
    type          TenantType         // direct | hospital | insurer
    logoUrl       String?
    primaryColor  String?
    supportPhone  String?
    serviceLines  String[]           // ["doctor","nursing","physio","telemedicine"]
    isActive      Boolean  @default(true)
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  }
  ```
- [ ] Add `tenantId` (FK, nullable for now) to: `Patient`, `Visit`, `CarePlan`, `Invoice`, `OnlineBooking`, `Staff`, `NurseShiftAssignment`
- [ ] Seed the `anees` default tenant; backfill all existing rows with that tenant
- [ ] Once backfilled, drop `nullable` from `tenantId`
- [ ] Add `tenantId` filter to every Prisma query in `data.ts` files (use a query helper that injects the tenant from session)
- [ ] Update Medplum: add a `tenant-id` FHIR extension on Patient/Encounter/etc., and a `Group` resource per tenant (FHIR-native multi-tenancy pattern)
- [ ] Update RBAC: `getSessionUser()` returns `tenantId` derived from staff/patient → tenant join

### Frontend
- [ ] Admin nav shows current tenant name; superadmin can switch tenants
- [ ] Patient list queries scoped to current tenant
- [ ] No UI visible difference for now (we only have 1 tenant) — this is plumbing

### Sprint 2 — Definition of done
- Schema migration applied, all existing rows backfilled
- All admin queries scoped by tenant — a test tenant can be created and its data is invisible to `anees`
- Medplum resources carry tenant identifier
- Hospital tenant can be created in <5 minutes via admin UI (even if its portal isn't built yet)

---

## Sprint 3 — Hospital partner portal MVP (Weeks 5–6)

**Make the MOU hospital successful. Use it as the template for hospital #2.**

### Backend
- [ ] New route group: `src/app/hospital/` — tenant-scoped portal
- [ ] New `StaffRole` value: `hospital_partner` — added to enum
- [ ] Tenant-scoped staff seed for the MOU hospital
- [ ] Server actions for hospital staff: view referred patients, view outcomes, view audit log for their patients
- [ ] Discharge summary upload endpoint: accepts PDF + structured fields → creates Medplum `DocumentReference` + `Encounter` (sourced from hospital) + creates Anees Patient if new
- [ ] Webhook outbox table + sender: notify hospital systems on visit completed, summary received, claim filed
  ```
  model WebhookDelivery {
    id            String   @id
    tenantId      String
    event         String       // visit.completed, document.received, etc.
    payload       Json
    status        String       // pending | delivered | failed
    attempts      Int @default(0)
    lastAttemptAt DateTime?
    deliveredAt   DateTime?
  }
  ```
- [ ] Background job (cron or Trigger.dev) to retry pending deliveries with backoff

### Frontend (`/hospital/[tenantCode]/*`)
- [ ] Login (uses NextAuth, role `hospital_partner`)
- [ ] Dashboard: KPIs (referrals this month, visits completed, average time to first visit)
- [ ] Referral list (patients the hospital has sent us)
- [ ] Referral detail (patient demographics + linked encounters + outcomes + signed notes — read-only)
- [ ] Upload discharge summary (PDF + structured fields)
- [ ] Audit view: who accessed which records, when
- [ ] Webhook config UI

### Sprint 3 — Definition of done
- MOU hospital staff log in and see only their patients
- Discharge summary upload flows end-to-end (hospital → R2 via Medplum Binary → Anees admin → patient portal)
- At least one webhook event delivers reliably to a hospital endpoint (or a stub)
- Founder can demo the full hospital-referral flow

---

## Sprint 4 — Telemedicine integration (Weeks 7–8)

**New service line. Required for MOU partner's post-discharge follow-ups. Daily.co is the chosen vendor.**

### Backend
- [ ] Sign up for Daily.co paid plan with HIPAA BAA (or 100ms as alternative if cost concerns)
- [ ] Update CSP in `next.config.ts` to allow Daily.co domains
- [ ] Server endpoints: create room, generate signed join token (short-lived), end room
- [ ] Telemedicine visit type already exists in `VisitType` enum (`telemedicine`) — wire room creation to Visit creation
- [ ] On visit completion: create Medplum `Encounter` of type virtual, save call duration as an Observation, optionally save recording link as a `DocumentReference`
- [ ] Add `webRtcSessionId` and `recordingUrl` to `Visit` (or store on the Encounter as a FHIR extension)

### Frontend
- [ ] Admin: schedule a telemedicine visit (creates room, sends patient a link via WhatsApp/SMS)
- [ ] Patient portal: "Join call" button visible 15 minutes before scheduled time
- [ ] Clinician: launches call from admin patient detail
- [ ] Embedded call UI (Daily.co prebuilt component — fastest path)
- [ ] Post-call: clinician writes a note (existing flow), marks visit complete

### Sprint 4 — Definition of done
- Telemedicine visit can be scheduled, joined by both parties, completed, and a clinical note signed against it
- Recording (if consent given) is stored and accessible via the patient portal `/files` tab
- HIPAA BAA signed with Daily.co (or whichever vendor)

---

## Sprint 5 — Hardening + Observability + Compliance docs (Weeks 9–10)

**The "investor due diligence" sprint.**

### Backend / Infra
- [ ] Add **Axiom** or **BetterStack Logs** — structured logs from server, no PHI in log lines
- [ ] Add **PostHog** (self-hosted, EU region, or PostHog Cloud EU) for product analytics — no PHI in events
- [ ] **Grafana Cloud free tier** for metric dashboards — uptime, response times, error rates
- [ ] **BetterStack public status page** at `status.anees.health`
- [ ] Penetration test scope agreed with an external Egyptian security firm (book for Sprint 6)
- [ ] Run an **audit gap audit**: random sample 100 patient operations from the last week, confirm 100% have audit trail in both Medplum and Postgres
- [ ] Run a **disaster recovery drill**: spin up staging from yesterday's backup, verify integrity, time it (target <2 hours)

### Compliance docs
- [ ] Egypt DPL compliance one-pager (legal review)
- [ ] DPA + privacy policy update (covers Medplum self-host, Cloudflare R2, Daily.co, Sentry)
- [ ] Security one-pager for hospital procurement (architecture, encryption, audit, access control, incident response)
- [ ] Incident response plan (1 page: who, what, when, escalation)
- [ ] BAA template for future US partners (signed with Daily.co, ready to extend to others)

### Sprint 5 — Definition of done
- Public status page live
- Logs + metrics + errors all observable in one place per engineer
- Compliance pack exists as a single shared folder, ready to send to a hospital procurement team
- Disaster recovery drill completed, runbook updated with measured times

---

## Sprint 6 — Insurance integration spike + second hospital (Weeks 11–12)

**Lay groundwork for the insurance revenue stream. Sign the second hospital.**

### Backend
- [ ] **Insurance research spike** — document Egypt UPA (Universal Health Insurance Authority) integration requirements: APIs, eligibility check formats, claim submission flow
- [ ] Prototype FHIR `Coverage` resource creation when patient enters insurance details
- [ ] Prototype FHIR `Claim` resource generation after visit completion (no submission yet)
- [ ] Add `insurance.*` fields to Patient are already present — wire them into the Medplum `Coverage` resource
- [ ] Identify which insurer to pilot with first (talk to MOU hospital — they likely have a preferred insurer)

### Hospital #2
- [ ] Sales: 2–3 active conversations with other Egyptian hospitals
- [ ] Use Sprint 3's hospital portal + this sprint's polish as the demo
- [ ] Sign hospital #2 (or get to LOI)
- [ ] Onboard hospital #2 to a new tenant in <1 day (proving multi-tenancy works)

### Penetration test
- [ ] External pentest executes during this sprint
- [ ] Triage findings: P0/P1 fix immediately, P2/P3 added to backlog

### Sprint 6 — Definition of done
- Insurance integration is no longer a mystery — we have a 5-page spec and an estimate for the first pilot
- Hospital #2 contracted (or signed LOI)
- Pentest report received; no unmitigated P0/P1 findings
- Founder can credibly pitch a Series A: "MOU hospital live, second hospital signed, insurance pilot specced, pentest passed, compliance documented"

---

## What comes next (Sprint 7+, weeks 13–24)

After 12 weeks, here's what queues up. **Don't pre-decide order — let the MOU partner's actual needs shape priority.**

| Likely Sprint 7+ workstream | Why |
|---|---|
| **First insurance claim flow** (live, not prototype) | Unlock new revenue |
| **Mobile app (Expo)** | One unified RN app, role-routed; TestFlight + Internal Testing first |
| **Clinician offline mode** | Required once mobile pilots in homes with weak signal |
| **White-label config layer** | When hospital #3 demands branded patient experience |
| **Care plan templates expansion** | Per service line and per hospital partner |
| **SOC 2 Type I prep** (Vanta or Drata) | Required by serious enterprise hospital deals |
| **Data warehouse** (Tinybird or BigQuery) | Investor metrics, hospital reporting, AI-readiness |
| **GCC expansion prep** (multi-currency, HyperPay/Tap integration, UAE entity research) | Year 2 expansion |
| **Migrate production to AWS Bahrain `me-south-1`** | When enterprise hospital procurement demands it |

---

## Cadence — how we run this

### Daily
- 15-minute standup (async OK): yesterday / today / blockers
- Engineer responds to Sentry errors within working hours

### Weekly
- Friday demo: what shipped this week, founder pokes it on staging
- Backlog grooming: shape next week's work

### Per sprint (every 2 weeks)
- Monday: sprint kickoff, lock the 5–8 tickets for the sprint
- Friday week 2: sprint review, retrospective, demo to founder
- Update this document — mark sprint as done, capture lessons

### Per month
- Restore drill: actually restore a backup to staging, verify integrity, log the time
- Audit gap check: verify audited models all have rows in last 30 days
- Update `CTO_STRATEGY.md` decision log if any irreversible call was made
- Review CSP for new third-parties that landed in code

---

## What we are explicitly NOT doing in the next 12 weeks

To keep this honest:

- ❌ Building a separate caregiver app (caregivers use `/portal` via Consent — delete the empty folders unless we change our minds with a real cost decision)
- ❌ Building the mobile app (Sprint 7+ — backend must be stable on OVH first)
- ❌ White-labeling (Sprint 7+ — after hospital #2 wants it)
- ❌ Active insurance claims (Sprint 6 specs it; live in Sprint 7+)
- ❌ AI / ambient scribe / LLM features (later — distraction now)
- ❌ Migrating to AWS Bahrain (later — OVH is fine through 10k+ patients)
- ❌ Kubernetes, microservices, service mesh (never at this stage)
- ❌ Public app store launch (still TestFlight / Internal Testing later)
- ❌ Building our own video, our own SMS, our own anything that has a good vendor

When tempted to add something here, ask: **does this serve the 12-week goal?** If no, it goes in Sprint 7+.

---

## Red flags to halt a sprint

Stop work and escalate if:
- AuditLog gap discovered on an audited model — **P0**
- PHI in an error message, log line, or analytics event — **P0**
- Cross-tenant data leak (patient from tenant A visible to staff of tenant B) — **P0**
- Backup hasn't run for >24 hours — **P0**
- Patient sees another patient's data, even briefly — **P0**
- Postgres ↔ Medplum sync drift (rows in one, not the other) — **P0**
- Hostinger and OVH both running with live writes — **P0** (split-brain risk)
- Mobile UX broken for Arabic / RTL on any new screen — **P1**
- Sprint slipping by >3 days without communication — **P1**

---

## Where this document lives

- This file: `docs/EHR_NOW.md` — the **what / now**
- Long-view: `docs/CTO_STRATEGY.md` — the **why / phases**
- Reference: `.claude/CLAUDE.md` — the **current codebase state**
- Codebase: `src/` — the **how**

Update this file **at the end of every sprint**. Move done sprints to a "Completed" section at the bottom. Add the next sprint's plan to the top of the queue. Keep it ruthlessly current — a stale plan is worse than no plan.

---

— End of document —
