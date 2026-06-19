# Anees Health — Product, Business-Logic & Medical Launch Audit (v2)

> **What changed in v2:** Scope is now locked by the owner (see §1). Launch is **all three clinical disciplines** (doctor, nurse, physiotherapist) + **full back-office** (admin, superadmin, medical-ops/case-manager) + the **patient view** — not a physio-only pilot. **No cash anywhere — prepayment only.** Hospital portal & white-label are **deferred**. This version adds the deep role-by-role journeys, the operational dashboards each role needs (earnings, profile, scheduling), the prepayment money-model, and a section of things that were missing from the brief.
>
> **Audience:** the owner (non-technical). Plain language first; file references for engineers.
> **Date:** 2026-06-19. **No implementation — this is the map and the plan only.**

---

## 0. One-paragraph verdict (for the new scope)

The clinical foundation is strong and reusable; the gap is that **only the physiotherapist has a finished journey, and only physio has earnings + pay logic.** Launching all three disciplines at once means **cloning the physio pattern to nurse and doctor**, building the **case-manager hub** that ties a multi-disciplinary team to one patient, and replacing the cash assumptions with a **prepayment-first money loop** (gateway + InstaPay). The biggest *hidden* risks for this scope are: (a) **you still can't create staff without a developer**, (b) **InstaPay has no automatic confirmation** so you need a manual reconciliation workflow, and (c) **a single patient now has three clinicians at once**, which the product doesn't yet coordinate. None of these are huge — but all three must be solved before real patients. Defer hospitals/white-label exactly as you said; they share a pipe we'll build anyway (intake).

---

## 1. Locked launch scope (your decisions, written back)

| Decision | Locked value |
|---|---|
| **Disciplines at launch** | **Doctor + Nurse + Physiotherapist** — all three, now |
| **Back-office at launch** | **Admin, Superadmin, Medical-Ops / Case-Manager** |
| **Patient** | **Read/view + booking + prepay** (full self-service portal is staged after the clinical core works) |
| **Payment** | **Prepayment only. NO CASH.** Card via gateway (Kashier) **+ InstaPay** |
| **Coverage area** | **Greater Cairo = Cairo + Giza** only |
| **Pricing & commission** | **Manual, per case** — every case is quoted/priced by hand; no automated price catalog or commission engine at launch |
| **Clinician pay rates / payouts** | **Not automated now** — pay rates per discipline are *not* defined yet; payouts handled manually/offline. Earnings *automation* is deferred |
| **Doctor scope at launch** | **Review + sign only** (chart-based). Doctor home-visit field app comes later |
| **InstaPay confirmation** | **Either ops or finance** may confirm; **no proof required** (a screenshot may be requested if needed) |
| **SLA** | **No hard SLA** (we're testing); **target < 24h** booking-to-visit; **no emergency service** |
| **Receipts** | **Simple receipt** (not a compliant e-invoice) at launch |
| **Notifications strategy** | **Deferred** — except the WhatsApp OTP needed to claim an account (that's auth, not marketing) |
| **Hospital partner portal (B2)** | **Deferred** |
| **White-label / multi-tenant (B3)** | **Deferred** |
| **Goal of launch** | **A working EHR + operations for our own direct clients**, all main roles live |

Everything below is re-planned against this scope.

---

## 2. The business model at launch (B1 only)

You are launching **one** of your three business lines: **direct home healthcare in Greater Cairo, prepaid.** B2 (hospital referrals) and B3 (white-label) are explicitly parked. Keep one rule:

> **No screen, role, or tab ships at launch unless it serves the direct-care money loop or clinical safety.** Everything else is hidden behind a flag, not deleted.

The deferral of B2/B3 is the right call — **but build the patient/case *intake* pipe in a way that a hospital referral can reuse later** (same pipe, different source). That's the one piece of forward-thinking that costs nothing now and saves a rebuild later.

---

## 3. The money model — *prepayment-first* (this is new and important)

Going cash-free changes the entire visit lifecycle. **Payment now happens BEFORE the visit, not after.** This is simpler in some ways and adds two real gaps you didn't mention.

### 3.1 The corrected money loop (with your decisions baked in)
```
Lead/Intake → Case quoted MANUALLY (per-case price — no auto catalog)
        → Booking (discipline + slot + area-checked)
        → PREPAYMENT (gateway = auto-confirm  OR  InstaPay = manual-confirm)  ← no visit until paid
        → Patient/Case created + portal invite (WhatsApp OTP)
        → Visit scheduled & dispatched
        → Visit delivered + documented (the EHR)
        → Simple receipt to patient
        → Clinician payout handled MANUALLY/offline (no pay engine at launch)
```
**Two owner decisions simplify this loop:** pricing is **manual per case** (no price catalog or commission engine to build), and **clinician pay is not automated** (payouts are reconciled offline for now). That removes a large chunk of launch work — see §3.4.

### 3.2 Gap A — **InstaPay has no automatic confirmation.** (You will hit this on day one.)
- The card gateway (Kashier) is automated — a webhook confirms payment, the booking flips to paid by itself.
- **InstaPay is a bank-to-bank instant transfer; there is no merchant webhook.** A patient transfers to your account and the platform has *no automatic signal* it happened.
- **You need a manual reconciliation workflow.** Per your decision: **either an ops *or* a finance person can confirm** an InstaPay transfer, and **no proof is strictly required** (they may *ask* for a screenshot when something looks off, but it's not mandatory). They mark the booking **paid** → the visit is released for dispatch.
- **Product implication:** add a **`payment_pending` → `payment_confirmed`** step, a shared **"unconfirmed payments" queue** visible to both ops and finance with a one-tap "Confirm payment (+ optional note/screenshot)" action, and a clear patient instruction screen for how to pay via InstaPay. Without this, InstaPay bookings silently stall.

### 3.3 Gap B — **Refund, cancellation & no-show policy must be prepay-aware.**
- You already have `src/lib/billing/cancellation-policy.ts` — it must now drive **refunds of money already taken**, not just cancellation states.
- Define and encode: free-cancel window, partial-refund window, no-refund window, **patient no-show** (clinician travelled — partial charge?), **clinician no-show** (full refund + credit), late reschedule.
- **Who approves refunds and how** is an ops/finance screen you don't have yet.

### 3.4 Gap C — **Clinician payout: now DEFERRED (your decision), not a launch blocker.**
- You decided **pay rates per discipline aren't defined yet** and **commission is manual per case**. So **do not build pay automation or nurse/doctor earnings engines for launch.**
- `src/lib/billing/physio-pay-policy.ts` exists; leave it as-is. The physio earnings screen can stay (read-only, informational) but is **not** the basis for actual payment at launch.
- **At launch, payouts are reconciled manually/offline.** What you *do* need is a clean record to reconcile from: every delivered + signed visit, its manually-set price, and which clinician delivered it — exportable to a spreadsheet. That's a thin "delivered visits + amounts" export, not a pay engine.
- **Revisit pay automation post-launch** once you've seen real case economics. This is the single biggest scope reduction from your answers.

### 3.5 Gap D — Receipts (decided: simple receipt)
- You decided on a **simple receipt**, not a compliant ETA e-invoice, for launch. Good — that's far less work.
- Deliver an **auto-generated simple receipt** (case ref, patient, service, amount, date, payment method) the patient can download from the portal and that ops can re-send.
- Flag for later: if a corporate/insurer/hospital channel ever needs tax-compliant invoices, that's a separate post-launch build — don't let it creep into launch.

---

## 4. Coverage — *Greater Cairo only*, and it must be enforced

- You have a coverage map + `/api/coverage` (a *marketing* coverage check today).
- **At launch this must be an enforced gate, not a brochure:** a booking whose address falls outside **Cairo + Giza** must be **blocked or waitlisted at the booking step**, before payment — never after.
- Tie it to the patient address + GPS you already store (`Patient` GPS + geofence fields). The visit geofence already exists for check-in; extend the same idea to **intake eligibility**.
- **Product implication:** an "out of coverage" outcome on the booking form (with a "notify me when you reach my area" capture — cheap lead-gen for expansion).

### 4.1 SLA & urgency (your decision: soft target, no emergencies)
- **No hard SLA at launch** — you're testing. **Internal target: a visit within ~24h** of a confirmed (paid) booking.
- **No emergency / urgent-care service.** This is important and should be **stated explicitly to patients** (booking + portal): Anees is *scheduled* home care, not an emergency service; in an emergency, call emergency services.
- **Dispatch implication:** the case-manager board is a **next-24h scheduling board**, *not* a real-time emergency console. That's simpler to build — it doesn't need live second-by-second tracking to launch; "today + tomorrow's visits, assigned and on track" is enough.

---

## 5. Identity & access (carried from v1, still the front-door blockers)

These remain true and remain launch-blocking for the new scope.

1. **No staff-management UI.** You cannot create a doctor, nurse, physio, ops user, or admin without direct database access. The permission matrix authorizes `admin: sign` on staff management; the **screen does not exist.** → **#1 blocker.** For a 3-discipline launch you'll be onboarding *many* clinicians — this must be self-serve for admins.
2. **Signup = invite + claim, not open registration.** A person becomes a `Patient` when intake creates the case (from a booking/prepayment); they then claim the portal via **WhatsApp OTP** (already built). **Kill orphan Google signups** (they create a patient with no record and dead-end).
3. **Move staff login off the public marketing site** (`/admin/login` or a subdomain). Clinicians and admins should not share the patient login page.
4. **Prove password reset** before real users.

---

## 6. The launch role roster + first screen

Twelve roles exist; **launch turns on exactly seven** and hides the rest.

| Role | Launch? | First screen (home) | First-screen job |
|---|---|---|---|
| **Patient** | ✅ | Portal home | "Your next visit + last visit + one action" |
| **Physiotherapist** | ✅ | `/clinician/today` | "My visits today" |
| **Nurse** | ✅ | Field app "today" (to build) | "My visits today" |
| **Doctor** | ✅ | Doctor home (worklist → chart) | "Cases needing my review/sign + my visits" |
| **Medical-Ops / Case-Manager** | ✅ | Dispatch/intake board | "What needs assigning / confirming / watching now" |
| **Admin** | ✅ | Admin home | "Run the business: staff, patients, payments, settings" |
| **Superadmin** | ✅ | Admin home | Everything + platform settings |
| insurance_coordinator / finance | 🟡 | — | Finance *sub-functions* needed (refunds, payouts, reconciliation) even if the full claims role is parked |
| compliance_officer | 🟡 | `/admin/compliance` | Audit oversight (keep, light) |
| hospital_partner_admin | 🔴 hide | — | B2, deferred |
| viewer | 🔴 remove | — | No buyer journey |

> **Note on finance:** you said "no cash, prepayment only" — that *increases* the need for a finance function (refunds, InstaPay reconciliation, clinician payouts), even though insurance *claims* are parked. Treat **finance-ops** as a real launch need; treat **insurance claims** as deferred.

---

## 7. Role journeys — clinical work **and** their operational dashboard

For each launch role: **(A) their core journey**, **(B) the operational/self-service dashboard they need** (earnings/financials, public profile, availability), and **state today**. This is the heart of v2.

### 7.1 Patient (view + book + prepay)
**A. Journey:** Discover/book → **area check** → choose discipline + slot → **prepay** (gateway/InstaPay) → claim portal via WhatsApp → see *who's coming + when + how to prepare* → after visit: *summary, vitals, instructions, documents* → reschedule/cancel within policy → leave a rating → re-book.
**B. Self-service:** booking history, payment receipts, upcoming/past visits, downloadable visit reports, caregiver access management (consent — already built), notifications.
**Today:** Portal is an 8-tab clinical-data viewer, not a journey; entry is broken (§5); no booking→prepay→invite pipe; no receipts.
**Launch target:** narrative portal home + booking/prepay loop + receipts + report delivery. Full clinical-tab depth can stay but behind the friendly summary.

### 7.2 Physiotherapist (the template — most complete)
**A. Journey:** "Today" → visit → geofenced check-in → assessments + physio notes (sign) → check-out → handoff/tasks.
**B. Operational dashboard:**
- **Earnings/financials** — ✅ screen exists (`/clinician/earnings`). Per your decision, pay is **not automated at launch**, so treat this as *informational only*, not the basis of real payment.
- **Public profile** — ⚠️ **read-only today** (`/clinician/profile` shows license/syndicate). They cannot edit their public bio/photo. **Gap.**
- **Availability/scheduling** — ❌ not built. Clinicians can't declare when/where they work, so ops can't assign rationally. **Gap (shared by all disciplines).**
- License/credential status + expiry alerts — partial (display only).
**Today:** Best journey in the app; clone it for nurse + doctor.

### 7.3 Nurse (clone physio + add nursing specifics)
**A. Journey:** "Today" → visit → vitals + nursing notes + **medication administration** (record doses) + assessments (Braden/Morse/falls) → escalate red flags → handoff.
**B. Operational dashboard:** earnings — **deferred** (manual payout at launch, no nurse pay engine); profile; availability (**❌ to build**); licence status.
**Nursing-specific needs:** medication administration record (MAR) flow, standing-order execution (so they can act without per-visit MD sign), controlled-substance recording.
**Today:** Nursing *dashboard* exists, but **no field-clinician app** (CLAUDE.md: `/clinician` is physio-only). **Build the nurse journey on the physio template.**

### 7.4 Doctor (reviewer/signer + home visits)
**A. Journey (two modes):**
- *Reviewer/signer (from the chart):* review case → sign diagnoses (ICD-10), medical notes, prescriptions → **co-sign red-flag vitals** → reconcile meds → author **standing orders** (lets nurse/physio act between MD visits).
- *Home-visit doctor:* same "Today" field flow as physio/nurse for in-home physician visits.
**B. Operational dashboard:** earnings — **deferred** (manual payout, no doctor pay engine); **public profile** (doctors already appear on the public site via the `Doctor` model — they should manage bio/photo/specialties, with admin approval); availability (**❌** — only needed once doctors do home visits).
**Today:** Lands on `/admin/patients` (the chart) — **this is exactly right for launch**, since doctors are review + sign only. No doctor field app needed yet; profile self-management is a fast-follow.

### 7.5 Medical-Ops / Case-Manager (the hub — most under-built relative to its importance)
This role is the **engine room** of a multi-discipline home-care service. At launch it does the most.
**A. Journey:** **Intake** (new case from booking/prepay) → verify prepayment (incl. **InstaPay manual confirm**) → **assemble the care team** (which doctor + nurse + physio) → **schedule** visits against clinician availability + coverage → **live dispatch board** (who's where, en-route, late) → handle **disruptions/disputes/no-shows** → monitor escalations → **close the episode**.
**B. Operational dashboard:**
- **Scheduling/dispatch board** — for launch this is a **next-24h "today + tomorrow's visits, assigned & on track" board**, not the real-time "Uber map" (no emergencies → no need for live tracking to launch). 🟡 skeleton, **launch-critical** in this simpler form.
- **Unconfirmed-payments queue** (InstaPay) — ❌ new, needed; shared with finance.
- **Capacity & coverage view** — ❌ needed (who's available in which area today).
- Care-team assignment, reassignment, escalation triage — partial.
- **Manual case pricing** lives here too: ops/case-manager sets the per-case price that drives the prepayment.
**Today:** `/admin/ops` + disputes skeleton. **This needs the most net-new product for the new scope.**

### 7.6 Admin (run the business)
**A. Journey:** Onboard & manage **staff** (create clinician, assign role + licence) → manage **patients** → oversee **payments/refunds/payouts** → manage **services, pricing, promocodes, coverage** → view **business KPIs**.
**B. Dashboard:** revenue, visits, utilization, clinician roster, pending refunds, payout approvals.
**Today:** Admin can reach patients + most sections, but **cannot create staff (no UI)**, **cannot manage refunds/payouts (no finance-ops screens)**, and **cannot edit services/pricing in-app** beyond what the DB allows. **Several "run the business" screens are missing.**

### 7.7 Superadmin
Everything Admin does **+ platform settings** (feature flags, coverage areas, payment config, role grants, break-glass oversight). Today: implicit wildcard in the matrix; **needs the same missing screens as Admin, plus a settings surface.**

---

## 8. The multi-disciplinary care team (new at this scope — and currently uncoordinated)

This is the single biggest *clinical-product* change from physio-only: **one patient now has a doctor + a nurse + a physio at the same time.** The data model supports it (`CareTeam`, `VisitParticipant`, care plan), but the **product doesn't coordinate it**:

- **Who leads the case?** Usually the doctor authors the care plan; nurse + physio execute and update. Make the lead explicit.
- **Standing orders** are the mechanism that lets nurse/physio act safely between doctor visits — make sure they're usable, not just in the schema.
- **Handoffs between disciplines** (tasks) must be visible to each clinician on their "Today."
- **Co-sign on red flags** (e.g. abnormal vitals → doctor co-sign) must route to the right doctor.
- **The case manager owns the orchestration** (see §7.5) — without that role being real, a 3-discipline case has no conductor.

**Recommendation:** make the **care plan + care team the spine** of a case, with the case-manager as conductor and the doctor as clinical lead. Verify the cross-discipline handoff and co-sign flows end-to-end before launch.

---

## 9. Charts vs Dashboards vs Portal (placement — unchanged, still true)

Three things keep getting conflated:
- **Clinical chart** (`/admin/patients/[id]`) — the full record, for staff drill-down.
- **Dashboards** — *aggregate* worklists/KPIs (ops board, clinician "today", admin KPIs). **A role should start here**, then drill into the chart.
- **Patient portal** — a *friendly narrative*, not the clinical chart. Don't mirror 8 FHIR tabs at the patient.

**Charts (vitals trends)** belong: for the **patient** as a glanceable summary; for the **clinician** *inside* the relevant chart section (vitals trend within vitals) — never as a standalone "charts" destination. Roles that currently start *in* the chart (e.g. doctor on `/admin/patients`) are missing the **worklist/dashboard layer** that tells them *which* patient to open — that's the misplacement you felt.

---

## 10. Clinical-safety launch gate (non-negotiable before real patients)

Same as v1, now across three disciplines:
1. **Every clinical write passes a licence + discipline + scope check** (`canSignClinical`) — re-verify on *every* nurse/doctor/physio write path, no exceptions.
2. **No clinical hard-deletes** anywhere (soft-delete / entered-in-error only).
3. **Malware scan on a real backend in prod** (dev is `mock_clean` — must not ship).
4. **Restricted-tier gating** (mental health, HIV, reproductive, DV) verified end-to-end.
5. **Discipline boundaries hold:** a nurse can't sign physician notes, a physio can't prescribe, etc. (The matrix is correct — verify the *enforcement*.)

---

## 11. What was missing from the brief (things to add now)

You asked me to add what you forgot. These are real and most are launch-relevant:

1. **InstaPay reconciliation workflow** (§3.2) — the day-one operational gap.
2. **Refund / no-show / cancellation policy that moves real money** (§3.3).
3. ~~Pay policies + earnings screens for nurse and doctor~~ — **DECIDED: deferred.** No pay automation at launch; payouts manual/offline (§3.4).
4. ~~Platform commission model~~ — **DECIDED: manual, per case.** No commission engine to build.
5. **Clinician availability & scheduling** — clinicians declaring when/where they work; ops can't dispatch sanely without it (§7).
6. **Clinician public-profile management** — doctors are on the public site but can't edit their profile; profiles are read-only today.
7. **Clinician onboarding & credentialing** — licence upload, syndicate verification, **trial/quality scorecard** (physio has `TrialVisitScorecard`; nurse/doctor need an equivalent), expiry alerts.
8. **Coverage *enforcement*** at booking, not just a marketing map (§4).
9. **Multi-disciplinary care coordination** — the conductor problem (§8).
10. ~~Notifications strategy~~ — **DECIDED: deferred.** Only keep the WhatsApp OTP needed to claim an account (auth, not notifications). Visit reminders / en-route / "report ready" pings come later. *(Caveat: with InstaPay manual-confirm and no notifications, set patient expectations clearly on the booking screen so people aren't left wondering if payment landed.)*
11. **Ratings / reviews** of clinicians by patients → feeds public profiles + quality oversight.
12. **Visit report / document delivery** to the patient (prepay customers expect a deliverable).
13. **Identity & consent at the door** — patient identity confirmation + consent reaffirmation on-site (schema fields exist; verify the flow).
14. **Emergency / clinical-deterioration path** during a home visit (escalation + who to call).
15. ~~Receipts / e-invoicing~~ — **DECIDED: simple receipt** (not compliant e-invoice) (§3.5).
16. **Owner analytics** — revenue, visits, utilization, repeat-rate, NPS — the dashboard *you* read.
17. **Observability (Sentry)** before real patients — currently seam-only.
18. **Audit coverage for financial/operational mutations** (payments, refunds, payouts) — today only clinical writes are fully audited; money movement must be audited too.
19. ~~SLA expectation~~ — **DECIDED: soft target < 24h, no emergency service** (must be stated to patients) (§4.1).
20. **Data-isolation hygiene even single-tenant** — keep the `tenantId` discipline now so B3 later isn't a rebuild.

---

## 12. What to defer / park for this launch

- 🔴 Hospital-partner portal (B2) — deferred (your call). *Keep intake reusable for it.*
- 🔴 White-label / multi-tenant branding (B3) — deferred. *Keep tenant hygiene.*
- 🔴 Insurance **claims / prior-auth** — parked (you're prepaid, not insurer-billed). **But keep finance-ops** (refunds, payouts, reconciliation).
- 🔴 `viewer` role — remove.
- 🟡 Telemedicine, mobile app, MENA expansion — later phases.

---

## 13. Revised roadmap (re-planned for the locked scope)

Each phase is independently shippable and ends with a "can real people use it?" gate.

### Phase 0 — Lock & cut (no engineering)
Scope is locked (§1). Hide non-launch roles/screens. Make the **owner decisions** in §15. Set the **launch metric**.
*Exit:* one-page launch-scope sheet signed.

### Phase 1 — Front door (the access blocker)
- **Staff-management UI** (create doctor/nurse/physio/ops/admin, assign role + licence). Critical — you're onboarding many clinicians.
- **Clinician onboarding/credentialing** (licence upload, expiry, trial scorecard for all 3 disciplines).
- Move **staff login off the public site**; prove **password reset**.
- **Invite + claim** patient signup (WhatsApp OTP); kill orphan Google signups.
*Exit:* admin onboards a doctor, nurse, and physio; each logs in; a patient is invited and claims the portal — zero DB access.

### Phase 2 — Clinician journeys (physio + nurse field; doctor review/sign)
- **Nurse field app** (clone physio: today → visit → vitals/notes/MAR/assessments → sign).
- **Doctor flow = reviewer/signer only** (sign diagnoses/notes/meds + standing orders + co-sign routing). **No doctor home-visit app** — that's later.
- **Availability/scheduling** for the two *field* disciplines (physio + nurse); doctor availability deferred until doctor home visits exist.
- **Care-team + care-plan as the case spine** (§8) — multi-discipline coordination, doctor as clinical lead.
*Exit:* a patient with a nurse + physio in the field and a doctor signing remotely is documented cleanly; handoffs + co-signs work.

### Phase 3 — Prepayment money loop (cash-free, simplified by your decisions)
- **Coverage enforcement** at booking (Cairo + Giza); out-of-area blocked before payment.
- **Manual per-case pricing** (ops/case-manager sets the price) → **Booking → prepay → Patient/Case → invite** pipe.
- **Kashier (auto-confirm)** + **InstaPay (manual confirm)** with a **shared ops/finance unconfirmed-payments queue** (no proof required; optional screenshot).
- **Refund / no-show / cancellation** policy that moves real money (the one money rule still needing your numbers — §15).
- **Simple receipt** to patient.
- **Delivered-visits + amounts export** for manual payout reconciliation (NOT a pay engine).
- *Removed from launch by your decisions:* pay policies, earnings automation, commission engine, e-invoicing.
*Exit:* a real prepaid case (either rail) flows booking→paid→visit→documented→receipt with no manual DB steps; ops can export delivered visits to reconcile payouts by hand.

### Phase 4 — Case-manager hub + ops
- **Live dispatch board** (assign + track across 3 disciplines).
- **Capacity/coverage view**; disruption/dispute/no-show handling.
- Escalation triage; episode close.
*Exit:* ops runs a full day of multi-discipline visits from one board.

### Phase 5 — Operational dashboards & profiles
- Clinician **public-profile management** (with admin approval) — for disciplines shown publicly.
- Clinician **licence/expiry self-view** (earnings stays informational only — pay is still manual).
- **Admin business KPIs** + **owner analytics** (revenue, visits, utilization, repeat-rate).
*Exit:* clinicians self-manage their profile + licence; owner sees revenue/visits/utilization. *(Earnings automation remains a post-launch decision.)*

### Phase 6 — Patient portal as a journey
- Narrative portal home (next/last visit + one action).
- **Report/document delivery**, receipts, reschedule/cancel self-service, **ratings**, notifications.
*Exit:* a patient self-serves their whole experience post-booking.

### Phase 7 — Clinical-safety hardening → **GO-LIVE GATE**
- Real malware backend; licence-gate audit of every write (3 disciplines); restricted-tier verified; financial-mutation audit; Sentry live.
*Exit:* sign-off that no clinical or money write is ungated and nothing is hard-deleted. **Real-patient go-live.**

### Later (deferred): B2 hospital referrals → B3 white-label (enforced tenant isolation first).

---

## 14. Sprint plan (2-week sprints; demoable outcomes)

| Sprint | Theme | Demoable outcome |
|---|---|---|
| **S0** | Lock & cut | Scope sheet signed; non-launch roles hidden; owner decisions made |
| **S1** | Staff onboarding | Admin creates doctor + nurse + physio with roles/licences via UI |
| **S2** | Auth separation + patient invite | Staff login moved off public site; WhatsApp invite→claim works; password reset proven |
| **S3** | Clinician onboarding | Licence upload + expiry alerts + trial scorecard for all 3 disciplines |
| **S4** | Nurse field app | Nurse runs a visit: vitals + notes + MAR + sign |
| **S5** | Doctor review/sign | Doctor signs diagnoses/notes/meds, authors standing orders, co-signs a red flag (no field app) |
| **S6** | Availability + care team | Field clinicians (physio + nurse) set availability; a multi-discipline care team is assembled on one patient |
| **S7** | Coverage + intake pipe | Out-of-area booking blocked; in-area booking creates Patient + Case + invite |
| **S8** | Prepay rails + pricing | Manual per-case price set; Kashier auto-confirm + InstaPay manual-confirm queue (ops/finance); visit released only when paid |
| **S9** | Refunds + reconciliation | Refund a cancelled prepaid visit (real money back); delivered-visits+amounts export for manual payout |
| **S10** | Scheduling board | Ops assigns next-24h visits across disciplines + handles a no-show (no live map needed) |
| **S11** | Dashboards + profiles | Clinician profile self-management + licence view; admin KPIs + owner analytics |
| **S12** | Patient portal journey | Narrative home + receipts + report delivery + reschedule + rating |
| **S13** | Hardening I | Real malware backend; licence-gate audit across 3 disciplines |
| **S14** | Hardening II | Restricted-tier verified; financial-mutation audit; Sentry live → **GO-LIVE** |

*(Compress by running clinician-journey sprints in parallel if you have the team; the sequence assumes a small one.)*

---

## 15. Owner decisions — resolved & remaining

### 15A. Resolved (locked 2026-06-19)
| Question | Decision |
|---|---|
| Platform commission | **Manual, per case** — no engine |
| Pay rates per discipline | **Not now** — pay automation deferred, payouts manual |
| InstaPay confirmation | **Ops *or* finance** can confirm; **no proof required** (optional screenshot) |
| SLA | **No hard SLA**; target **< 24h**; **no emergency service** |
| Doctor scope at launch | **Review + sign only** (no doctor field app yet) |
| Receipt | **Simple receipt** (not e-invoice) |
| Notifications | **Deferred** (keep only WhatsApp OTP for account claim) |

### 15B. Still genuinely open (one money rule + a couple of small calls)
1. **Refund / cancellation numbers.** You confirmed prepayment but not the *rules*. Decide: free-cancel window (e.g. > 24h before visit = full refund), late-cancel (e.g. < 24h = partial/none), **patient no-show** (clinician travelled — charge a fee or forfeit?), **clinician no-show** (full refund + priority re-book). This is the only money rule still blocking Phase 3. *(Recommended starting point: full refund if cancelled > 24h out; 50% if < 24h; no refund on patient no-show; full refund + free re-book on clinician no-show — adjust as you test.)*
2. **Who sets the per-case price** — case-manager, admin, or either? (Recommended: case-manager sets, admin can override.)
3. **Public profiles** — which disciplines appear publicly (doctors clearly; physios maybe; nurses usually not)?

### 15C. Recommended launch metric (you asked me to choose)
Because you're a startup *testing*, pick **one primary metric** plus a couple of guardrails — not a revenue target.

- **Primary (the "it works" metric):** *Number of **clean end-to-end cases** delivered* — where a clean case = **booked → prepaid (either rail) → visited by the assigned clinician → documented & signed → receipt issued, with zero manual database edits.** A good first-month goal: **10 clean cases**, including **at least one multi-discipline case** (e.g. nurse + doctor sign-off).
- **Guardrail 1 — Operational honesty:** **% of cases needing a manual DB fix = 0.** (If this isn't zero, the front-door/pipe work isn't actually done.)
- **Guardrail 2 — Promise kept:** **% of visits delivered within 24h of payment** (you're not contractually bound, but watch it).
- **Guardrail 3 — Safety:** **zero ungated clinical writes, zero clinical hard-deletes** (from the Phase 7 gate).
- **Quality signal (qualitative):** a short post-visit rating from the patient — even 1–5 stars — to learn early.

> Why this metric: at the testing stage, the thing that kills you isn't low revenue — it's the loop secretly *not closing* (manual DB edits, stuck InstaPay, unsigned visits). The primary metric is designed to **expose exactly that**.

---

## 16. Appendix — launch actor map

```
                         ┌─────────────────────────────────────────┐
                         │     ANEES — DIRECT HOME CARE (B1)         │
                         │     Greater Cairo · Prepaid · 3 disciplines│
                         └─────────────────────────────────────────┘
   PATIENT SIDE                       STAFF SIDE
 ┌──────────────────┐   ┌───────────────────────────────────────────────┐
 │ Patient/Caregiver│   │ FIELD CLINICIANS (one care team per patient)    │
 │  → portal        │   │   Doctor 🟡  Nurse 🟡(build)  Physio ✅(template) │
 │  book + PREPAY   │   │     each needs: journey + earnings + profile +  │
 │  (gateway/InstaPay)│ │                 availability                    │
 │  invite + claim  │   │ THE HUB                                         │
 │                  │   │   Medical-Ops / Case-Manager 🟡  ← conductor    │
 │                  │   │     dispatch board · payments queue · capacity  │
 │                  │   │ BACK OFFICE                                     │
 │                  │   │   Admin ✅(needs staff+finance screens)          │
 │                  │   │   Superadmin ✅(+settings)                       │
 │                  │   │   Finance-ops 🟡(refunds/payouts/reconcile)      │
 │                  │   │   Compliance 🟡(light)                          │
 └──────────────────┘   └───────────────────────────────────────────────┘
        PREPAY ONLY (no cash) · coverage-gated to Cairo+Giza
        DEFERRED: hospital portal (B2) · white-label (B3) · insurance claims
```

**Slogan for v2:** *Three finished clinician journeys, one conductor, money taken before the visit — then the patient sees it all.*

---

### Cross-references
- Strategy & phases: `docs/CTO_STRATEGY.md`
- Clinical gap register (read before trusting "done"): `docs/EHR_AUDIT.md`
- Current sprint plan to reconcile: `docs/EHR_NOW.md`
- The permission grid (strong, keep): `src/lib/auth/policy/ehr-matrix.ts`
- Role routing: `src/lib/auth/route-access.ts`
- Cancellation policy (extend for refunds): `src/lib/billing/cancellation-policy.ts`
- Physio pay policy (clone for nurse + doctor): `src/lib/billing/physio-pay-policy.ts`
