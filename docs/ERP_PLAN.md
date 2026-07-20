# ERP Plan & Implementation Runbook — Anees Health Platform

> **Owner:** CTO / lead engineer · **Audience:** the engineer who implements this, plus the owner (so they know what they're signing up for).
> **Created:** 2026-07-17 · **Status:** **plan only — nothing built, nothing decided.** Three gates in §4 must be answered before any money or engineering is spent.
> **Decision context:** written against the **real** current topology (Vercel app + Hostinger VPS backend + Cloudflare R2), not the outdated "OVH Bahrain / Cloudflare edge" story in older docs. Companion to [METABASE_SETUP.md](./METABASE_SETUP.md) — read that first; the two projects are different and are often confused (see §0.1).

---

## 0. What this is (plain language)

An **ERP** ("enterprise resource planning") is the system your business runs its *back office* on: the accounting ledger, supplier bills, staff payroll, tax filing. It is where your accountant works.

This document proposes **ERPNext** — free, open source, self-hosted — as the Anees back office, deliberately scoped to **finance and HR only**. Patients, visits, and clinical records stay exactly where they are (Anees + Medplum) and the ERP never sees them.

### 0.1 This is *not* the Metabase project

They get confused constantly. They are different tools solving different problems, and you want both:

| | **Metabase** ([runbook](./METABASE_SETUP.md)) | **ERPNext** (this doc) |
|---|---|---|
| Answers | "How is the business doing?" | "What do the books say? How do I pay people and file tax?" |
| Reads or writes | **Reads** your live data | **Owns** its own separate financial data |
| Who uses it | Owner, ops | Accountant |
| Needs an accountant | No | **Yes — it is worthless without one** |
| Effort | Days | Months |

**Metabase is the cheaper, faster win and should ship first.** Nothing in this document should delay it.

---

## 1. The finding that changes this plan ⚠️ read before anything else

The natural design would be "sync `Invoice` and `Payment` from Anees into ERPNext." **That design is impossible today**, because those tables are empty.

Verified by code search on 2026-07-17:

| Table | Written by | Read by |
|---|---|---|
| `Invoice` | **nothing — zero references in `src/`** | nothing |
| `Payment` | **nothing** | `features/admin/analytics/data.ts` (aggregates) |
| `Expense` | **nothing** | nothing |
| `ProviderPayout` | **nothing** | `features/ehr/admin-nursing-dashboard/data.ts` (aggregates) |
| `Claim` / `ClaimLineItem` | **nothing** | `app/admin/insurance/page.tsx` (read-only list) |

There is **no `prisma.invoice.create`, no `prisma.expense.create`, no `prisma.providerPayout.create` anywhere in the codebase.** These are aspirational schema — designed, migrated, never wired. The analytics dashboard that sums `Payment` is summing an empty table.

**Where the real money actually is:**

| Table | Role | Real? |
|---|---|---|
| `OnlineBooking` | Every paid booking. Carries `baseAmountEgp`, `discountEgp`, `amountEgp`, `currency`, `status`, `promocodeCode`, `kashierSessionId`, `kashierOrderId`, `kashierTransactionId`, `paymentCompletedAt`, `convertedVisitId`, `tenantId` | ✅ **This is your revenue ledger** |
| `Refund` | Refund decisions: `amountPaidEgp`, `feeEgp`, `refundEgp`, `reasonCode`, `method`, `status`, `completedAt` | ✅ Live (`features/admin/billing/actions.ts`) |
| `Promocode` | Discounts: `kind` (`percentage`\|`fixed`), `value`, `redeemedCount` | ✅ Live |

**Consequences, which the rest of this plan is built around:**

1. **The sync source is `OnlineBooking` + `Refund`, not `Invoice` + `Payment`.** Don't build against empty tables.
2. **Do not "fix" the empty tables first.** Building a real invoicing module inside Anees, and *then* syncing it to ERPNext, means building the same thing twice. ERPNext *is* the invoicing module. Let it be.
3. **`Expense` and `ProviderPayout` have no data at all** — not thin, *empty*. Provider payouts today are presumably tracked outside the system entirely. So for those, ERPNext isn't a *sync target*, it's the **first home that data has ever had**, entered by hand. That is a feature, not a gap (§11, Sprint 6).
4. **The `Invoice`/`Payment`/`Expense`/`ProviderPayout` models should eventually be deleted** from `prisma/schema.prisma` once ERPNext owns that domain — they are dead weight that misleads every future reader (and already misled the analytics dashboard). Track separately; do not do it as part of this project.

---

## 2. What Frappe, ERPNext, bench, and MariaDB actually are (plain language)

These names all show up together and it's genuinely confusing. Here's the whole family:

- **Frappe Framework** — the *foundation*. A Python web framework (comparable to Django or Rails) built by Frappe Technologies. It is not an ERP. It provides the database layer, user/permission system, REST API, and admin UI that applications are built on.
- **ERPNext** — the *application* you actually want. A full ERP (accounting, HR, payroll, inventory, purchasing, CRM) built **on top of** Frappe. Licence: GPLv3.
- **DocType** — Frappe's word for "a kind of record." `Sales Invoice`, `Customer`, `Payment Entry` are all DocTypes. Wherever this doc says "DocType," read "table."
- **bench** — the command-line tool for installing and managing Frappe/ERPNext directly on a server. **We are not using it.** It is notoriously fragile, especially across upgrades. Mentioned only so you recognise it in tutorials and know to skip them.
- **frappe_docker** — the official Docker deployment. **This is what we use.** Containers, one `docker compose` file, upgrades by changing an image tag.
- **MariaDB** — the database ERPNext stores its data in (a fork of MySQL). See §7 — this is the point people panic about, and it's fine.
- **Redis** — in-memory cache/queue that Frappe needs for background jobs. Ships in the Docker setup. You will never think about it.

**Version:** ERPNext v15 is the current stable line at time of writing. **Verify the current stable release before installing** — do not trust this line in six months.

**Relevant capabilities we are relying on** (verify each during Sprint 1's spike, don't take this doc's word):
- Multi-company (maps to your `Tenant` — see §9)
- Multi-currency with EGP
- Arabic / RTL user interface
- REST API at `/api/resource/{DocType}` with `api_key:api_secret` token auth
- Custom fields on any DocType without forking the codebase
- Built-in two-factor authentication
- Country-specific chart-of-accounts templates *(Egypt template availability: **unverified** — check in Sprint 1; a manual chart of accounts is an acceptable fallback and your accountant will want to customise it anyway)*

---

## 3. Decisions (locked, unless a gate in §4 says otherwise)

| # | Decision | Why |
|---|---|---|
| D1 | **ERPNext, not Odoo** | Odoo's free Community edition paywalls the general ledger, financial reports, and payroll localisations behind Enterprise. You would build your entire back office and hit a wall exactly where you need it. ERPNext has no crippled edition. **Reversible only by gate G1.** |
| D2 | **Its own VPS. Not the Hostinger box.** | §6 |
| D3 | **Subdomain `erp.aneeshealth.com`**, DNS A-record added in Vercel DNS → new VPS IP | Free, instant TLS, staff recognise the domain. A separate domain trains your team to trust unfamiliar domains — that is literally how phishing works. |
| D4 | **Docker (`frappe_docker`), never `bench`** | §2 |
| D5 | **MariaDB for ERPNext. Postgres stays untouched.** | §7 |
| D6 | **Finance + HR scope only.** No patients, no visits, no clinical data, ever. | §8 |
| D7 | **One-way sync: Anees → ERPNext. Nothing flows back.** | §8, §10 |
| D8 | **Anees remains the system of record** for bookings, visits, patients. ERPNext is downstream and disposable — if it burned down, you could rebuild it from Anees + the accountant's knowledge. | §8 |
| D9 | **Sync runs as a Vercel cron → `/api/internal/erp/sync`**, guarded by `CRON_SECRET` | Matches the existing house pattern (`/api/internal/ehr/documents/scan`) |
| D10 | **Metabase ships first.** ERP does not block it, share a server with it, or borrow its engineer. | §0.1 |

---

## 4. Gates — answer these before spending anything ⚠️

**Do not start Sprint 1 until all three are answered.** Each can cancel or redirect the project.

### G1 — Does ETA e-invoicing apply to Anees?
Egypt's Tax Authority e-invoicing mandate is very likely **the single strongest business reason to own an ERP at all**. It also decides D1.

- **Ask your accountant:** does the mandate apply to us, on what timeline, and what are we doing today to comply?
- **Then verify, hands-on:** the maturity of the ETA integration for ERPNext (community-contributed — check whether it is actively maintained against the current ETA API and current ERPNext version) versus Odoo (believed to ship an official Egyptian localisation module — **confirm whether it is in Community or Enterprise; this doc does not know**).
- **If ERPNext's ETA integration is dead and Odoo's official module is free in Community → D1 flips to Odoo** and §9 must be rewritten. Better to learn this in week one than month four.

### G2 — Who is the accountant, by name?
**This is the real gate.** The entire timeline in §12 is set by this person, not by the server or the engineer.

- An ERP with nobody maintaining the chart of accounts is a slower, more expensive spreadsheet.
- They must agree to Sprint 2 (manual month) *before* Sprint 1 begins.
- **If you cannot name a person → stop. Do not build this.** The correct answer becomes "ship Metabase, revisit in six months."

### G3 — Where is it allowed to live?
The ERP will hold customer identifiers and amounts — **personal data under Egypt's PDPL**, and arguably health-adjacent (see §8.1). You already have an unresolved question about where clinical data should live.

- **Do not answer this independently for the ERP.** Two separate answers = data scattered across jurisdictions and two cross-border transfer problems instead of one.
- **Default: put the ERP wherever the clinical stack decision lands.** If that decision isn't made yet, keep the ERP in the same jurisdiction as the Hostinger box for now, and move it when the main stack moves.

---

## 5. Architecture (real current topology)

```
Accountant / owner browser
   │  https (ERPNext login + mandatory 2FA)
   ▼
erp.aneeshealth.com  ── DNS A-record added in Vercel DNS → NEW VPS IP
   │
   ▼  (on a NEW, dedicated VPS — not 152.239.112.57)
Nginx (TLS via Let's Encrypt)
   └─► ERPNext (frappe_docker stack, bound to 127.0.0.1)
         ├─ frappe web + background workers
         ├─ MariaDB   ← ERPNext's own data. NOT your app DB.
         └─ Redis     ← cache/queue


                  ── nightly, one-way ──►
Vercel cron ──► https://aneeshealth.com/api/internal/erp/sync   (Bearer CRON_SECRET)
                   │  reads OnlineBooking + Refund from operational Postgres
                   │  writes ErpSyncRecord (idempotency + audit)
                   └──► POST https://erp.aneeshealth.com/api/resource/...  (api_key:api_secret)

                                    ✗ ERPNext NEVER connects to Medplum
                                    ✗ ERPNext NEVER connects to operational Postgres
                                    ✗ Nothing flows back from ERPNext into Anees
```

Facts this design depends on:
- The **app runs on Vercel**; **operational Postgres + Medplum run on the Hostinger VPS (152.239.112.57)**; **Metabase is slated for that same Hostinger VPS**. ERPNext is the odd one out and gets its own box (§6).
- ERPNext **never touches the operational Postgres directly.** This is the opposite of the Metabase design (which reads Postgres through masked `bi` views) — and the difference is deliberate. Metabase *reports on* your data; ERPNext *owns different data*. ERPNext receives a small, curated push over HTTPS and nothing more.
- Backups go to **Cloudflare R2**, which you already run.

---

## 6. Same VPS or separate? — **separate. Non-negotiable.**

It is *technically* possible to put ERPNext on the Hostinger box. Do not.

**1. That box holds every patient's medical record.** Medplum + the operational Postgres live there. Every additional service is another door into the most sensitive machine you own. Your accountant should not be one weak password away from the clinical database. This reason alone is sufficient.

**2. The box is already getting crowded.** Current + planned load on 152.239.112.57:

| Service | Status |
|---|---|
| Medplum | live |
| Operational Postgres | live |
| Metabase + its own metadata Postgres | planned ([METABASE_SETUP.md](./METABASE_SETUP.md)) |
| ERPNext + MariaDB + Redis + workers | ← *would be the fourth stack, and a second database engine* |

You would be running **Postgres and MariaDB side by side**, competing for RAM, on the machine that must never go down.

**3. Blast radius.** ERPNext at month-end close is a heavy workload. If it eats the RAM or fills the disk, it must not take patient care down with it. Separate boxes make that structurally impossible instead of merely unlikely.

**4. Upgrade cadence conflict.** ERPNext upgrades are frequent and occasionally break. Medplum upgrades are rare and carefully planned. Coupling them to one maintenance window is self-harm.

### Server spec

| | |
|---|---|
| RAM | **8 GB** (4 GB is the technical floor and will make you miserable — ERPNext + MariaDB + Redis + workers) |
| CPU | 2 vCPU |
| Disk | 80 GB SSD |
| OS | Ubuntu LTS |
| Provider | Hostinger (existing relationship) or equivalent — subject to gate **G3** |
| Cost | ~$15–30/month |

---

## 7. The database question (and why it isn't a problem)

**ERPNext uses MariaDB. You use Postgres. This is fine and requires no action.**

The instinct is "we're a Postgres shop, make ERPNext use Postgres." **Do not.** Frappe's Postgres support is experimental and ERPNext in practice expects MariaDB; you would be fighting the framework forever, on the system holding your books, for zero benefit. **Verify the current state of Frappe's Postgres support during Sprint 1's spike, but the strong default is: use MariaDB and stop thinking about it.**

The reason this costs nothing:

> **ERPNext's MariaDB is not a replacement for your Postgres. It is a completely separate database holding completely different data, on a completely different machine.** They never talk. Your Postgres holds bookings, visits, patients. ERPNext's MariaDB holds ledger entries, invoices, journal entries. The only thing crossing between them is a nightly HTTPS push of a handful of numbers.

You already run two database engines (Postgres for operations, Medplum's own store for clinical). A third, isolated on its own box and administered entirely by Docker, is not a meaningful increase in complexity.

**Three databases you must never confuse:**

| Database | Holds | Lives on |
|---|---|---|
| Operational **Postgres** | bookings, visits, patients, staff | Hostinger VPS |
| **Medplum's** store | clinical records (FHIR) | Hostinger VPS |
| ERPNext's **MariaDB** | the general ledger | **new ERP VPS** |

---

## 8. Invariants (never violate)

1. **No clinical data in ERPNext. Ever.** No diagnoses, no notes, no observations, no medications, no `Patient.dnrStatus`, no `Patient.safetyFlags`, no `Patient.gpsLatitude`/`gpsLongitude`, no `Patient.nationalId`/`passportNumber`, no `Patient.bloodGroup`.
2. **ERPNext never connects to the operational Postgres or to Medplum.** No database credentials for either exist on the ERP box. If someone proposes "just let ERPNext read the bookings table," the answer is no.
3. **One-way only.** Anees → ERPNext. Nothing ERPNext produces is ever written back into Anees. If the accountant fixes a number in ERPNext, that fix lives in ERPNext.
4. **Anees stays the system of record.** ERPNext must be rebuildable from Anees + the chart of accounts. Never let a fact exist *only* in ERPNext that operations depend on.
5. **Every sync write is idempotent** and keyed on `anees_ref` (§10). Running the sync twice must never double-book revenue.
6. **Every sync run writes an `AuditLog` row** via `recordAudit` (`@/lib/utils/audit`) — per the house rule in `CLAUDE.md` that every Postgres mutation plans its audit trail.
7. **Mandatory 2FA for every ERPNext user.** No exceptions, including the owner.
8. **The ERP is in scope for PDPL.** Treat it as a system holding personal data, not as "just accounting." See §8.1.

### 8.1 The honest privacy caveat

Even scoped this tightly, a Sales Invoice for item `PHYSIO-HOME-VISIT` billed to customer `PT-00123` reveals that PT-00123 received physiotherapy. **That is health-adjacent information**, and pretending otherwise would be dishonest.

Mitigations, in order of preference:
- **Bill by `Patient.code`, not `Patient.fullName`** (see §9) — this is the single biggest lever, and it is why the mapping defaults to codes.
- **Keep the ERP user list tiny** (accountant, owner, maybe one ops lead). Fewer users than any other system you run.
- **Mandatory 2FA + no public exposure beyond TLS + firewall.**
- **Register the ERP in your PDPL processing records** alongside the app and Medplum.

**Gate G1 may force names into the system** — ETA e-invoicing generally requires buyer identification. If so, that is a compliance requirement overriding the privacy preference, and it must be a *conscious, recorded decision*, not something that quietly happens because the sync developer found `fullName` convenient.

---

## 9. Data mapping — Anees → ERPNext

Using real model and field names from `prisma/schema.prisma` as of 2026-07-17.

### 9.1 Master data (set up once, mostly by hand)

| Anees | ERPNext DocType | Notes |
|---|---|---|
| `Tenant.code` / `Tenant.name` | **Company** | `platform` → "Anees Health". ERPNext multi-company is a clean fit for your Phase-1A multi-tenancy foundation — **every synced document must carry the Company derived from `tenantId`.** Cross-tenant leakage here is the same P0 it is everywhere else. |
| `Area.name`, `Area.governorate` | **Territory** | Optional; enables revenue-by-area reporting |
| `ServiceCategory.name` | **Item Group** | |
| `Service.code`, `Service.name`, `Service.listPriceEgp` | **Item** (non-stock, `is_service_item`) + **Item Price** | `Service.status` (`active`\|`inactive`\|`discontinued`) → `disabled` |
| `ProviderRole.name` | **Supplier Group** / **Designation** | |
| `Provider` where `paymentType` ∈ (`per_visit`, `package`, `commission`) | **Supplier** | Contractors. `baseRateEgp`, `commissionPct` inform the payout, not the master record |
| `Provider` where `paymentType` = `salary` | **Employee** | Payroll (Sprint 7 — optional) |
| `InsurerProfile.code`, `.name` | **Customer** (group: Insurers) | The payer is a B2B customer who owes you money |
| `Patient.code` | **Customer** (group: Patients) | ⚠️ **`code`, not `fullName`** — see §8.1. `Patient.phone` only if ETA (G1) requires it. **Never** `nationalId`, `passportNumber`, GPS, `bloodGroup`, `dnrStatus`, `safetyFlags`. |
| `PaymentMethod.code` + Kashier + InstaPay + cash | **Mode of Payment** | Each mapped to a ledger account |
| `ExpenseCategory.code`, `.name` | **Account** (expense heads) under the chart of accounts | Note: `Expense` has **no rows** — this maps the *lookup table*, which is populated |

### 9.2 Transactions (the nightly sync)

| Anees source | ERPNext DocType | Mapping |
|---|---|---|
| `OnlineBooking` where `status` ∈ (`payment_completed`, `confirmed`, `converted`) | **Sales Invoice** | ⭐ **Your actual revenue.** `bookingRef` → `anees_ref` (unique). `baseAmountEgp` → item rate. `discountEgp` → `discount_amount`. `amountEgp` → grand total. `currency` (`EGP`). `paymentCompletedAt` → `posting_date`. `tenantId` → Company. `visitType`/`serviceType`/`specialty` → the Item. `convertedVisitId` → custom field `anees_visit_id` for traceability. |
| `OnlineBooking.promocodeCode` + `Promocode.kind`/`.value` | Sales Invoice `discount_amount` + custom field `anees_promocode` | Keep the code so marketing spend is attributable in the ledger |
| `OnlineBooking.kashierTransactionId` / `paymentCompletedAt` | **Payment Entry** | `reference_no` = `kashierTransactionId` (or InstaPay ref). Mode of Payment = Kashier / InstaPay. Allocated against the Sales Invoice above. |
| `Refund` where `status` = `completed` | **Credit Note** (return Sales Invoice) + **Payment Entry** (outgoing) | `bookingRef` links to the original. `refundEgp` → credit note total. `reasonCode` → custom field. |
| `Refund.feeEgp` | **stays as revenue** — separate income account "Cancellation fees" | ⚠️ Easy to get wrong: the cancellation fee is money you **keep**. It is not part of the refund. Netting it into the credit note understates revenue and misstates the P&L. |
| `Claim` + `ClaimLineItem` (`status` = `submitted`+) | **Sales Invoice** to the insurer Customer | `totalAmountEgp` vs `approvedAmountEgp` → the write-off is the interesting number. **Currently zero rows** — defer to Sprint 6+. |

### 9.3 Deferred — no Anees data exists to sync

These have **empty tables** (§1). ERPNext is their **first home**, entered by hand, not a sync target:

| Anees model | ERPNext | Reality |
|---|---|---|
| `Expense` | Purchase Invoice (with vendor) / Journal Entry (without) | 0 rows. Accountant enters directly in ERPNext. |
| `ProviderPayout` | Purchase Invoice (Supplier) / Salary Slip (Employee) | 0 rows. Payouts are tracked outside the system today. |
| `Invoice`, `Payment` | *(superseded by the `OnlineBooking` mapping)* | 0 rows. **Should be deleted from the schema** once ERPNext is live. |

---

## 10. Sync design

### 10.1 Idempotency — the core mechanic

Add a **custom field `anees_ref`** to Sales Invoice, Payment Entry, and Credit Note in ERPNext. Mark it **unique**. It holds the Anees `bookingRef` (or `Refund.id`).

Every write is an **upsert keyed on `anees_ref`**: look it up, create if missing, skip if present. This makes the sync safe to run twice, safe to re-run after a crash, and safe to backfill. **A sync that can double-book revenue is worse than no sync at all** — this field is the thing preventing it.

### 10.2 New Prisma model (additive — touches no existing table)

```prisma
model ErpSyncRecord {
  id         String    @id @default(cuid())
  sourceType String    // 'online_booking' | 'refund'
  sourceId   String    // OnlineBooking.id | Refund.id
  sourceRef  String    // bookingRef — human-traceable
  erpDoctype String    // 'Sales Invoice' | 'Payment Entry' | 'Credit Note'
  erpDocName String?   // ERPNext's returned name, once created
  status     String    @default("pending") // pending | synced | failed | skipped
  attempts   Int       @default(0)
  lastError  String?
  syncedAt   DateTime?
  tenantId   String    @default("platform")
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([sourceType, sourceId, erpDoctype])
  @@index([status])
  @@index([sourceRef])
  @@index([tenantId])
  @@map("erp_sync_records")
}
```

The `@@unique` is the second line of defence behind `anees_ref`. Belt and braces, on purpose — this is money.

### 10.3 The route

`/api/internal/erp/sync` — mirrors the existing `/api/internal/ehr/documents/scan` pattern exactly:

- **Auth:** `Bearer ${CRON_SECRET}` (or a dedicated `ERP_SYNC_KEY` header, matching how the scan job accepts `x-ehr-scan-key`)
- **Trigger:** Vercel cron, nightly, off-peak
- **Reads:** `OnlineBooking` where `paymentCompletedAt` is in the window and no `synced` `ErpSyncRecord` exists; same for `Refund` where `status = 'completed'`
- **Writes to ERPNext:** `POST /api/resource/{DocType}` with `Authorization: token {api_key}:{api_secret}`
- **Audit:** every run emits an `AuditLog` row via `recordAudit` (invariant #6)
- **Failure:** fail **closed and loud**. Mark the `ErpSyncRecord` `failed` with `lastError`, do not swallow, do not report false success. *(Note: "false-success swallow" is an existing known follow-up in this codebase — do not repeat that pattern here, of all places.)*
- **Never logs:** the ERPNext API secret, `CRON_SECRET`, patient names, or full Kashier payloads

### 10.4 New environment variables

```bash
# ERPNext sync (Vercel)
ERP_BASE_URL=https://erp.aneeshealth.com
ERP_API_KEY=...
ERP_API_SECRET=...            # never logged
ERP_SYNC_ENABLED=false        # kill switch — ships false, flipped on in Sprint 5
ERP_DEFAULT_COMPANY=Anees Health
```

`ERP_SYNC_ENABLED` is deliberate: the sync ships **dark**, is proven in dry-run, and is switched on only when the numbers have been reconciled by hand.

---

## 11. Sprints

> Exit criteria are **binding**. "Mostly working" does not pass a money system.

### Sprint 0 — Decide *(1 week · no code · no spend)*
Answer **G1, G2, G3** (§4). Write the answers into this document.
**Exit:** all three answered in writing. The accountant is named and has agreed to Sprint 2. **If G2 fails → cancel the project and ship Metabase.**

### Sprint 1 — Server + install *(1–2 days · engineer)*
1. Provision the VPS (§6). 2. Add the `erp` A-record in **Vercel DNS** → new IP. 3. Install via `frappe_docker`. 4. Nginx + Let's Encrypt. 5. Firewall: 443 open; SSH restricted to known IPs; **nothing else**. 6. fail2ban. 7. Enable mandatory 2FA. 8. **Spike + record findings:** current stable ERPNext version, Egypt CoA template availability, ETA integration state (feeds G1), Arabic UI check.
**Exit:** accountant can log in at `https://erp.aneeshealth.com` with 2FA. Firewall verified from outside. Spike findings written down.

### Sprint 2 — Backups *(0.5 day · engineer · DO NOT SKIP)*
Nightly MariaDB dump → **Cloudflare R2** (separate bucket from medical documents), via `r2-medical.ts` conventions or a standalone script mirroring `deploy/metabase/backup-metabase.sh`. Retention ≥ 30 days.
**Exit:** **a restore has been performed onto a throwaway box and verified.** An untested backup is not a backup. Your books being *late* is survivable; your books being *gone* is not.

### Sprint 3 — Chart of accounts + masters *(1–2 weeks · accountant-led, engineer supports)*
Company, chart of accounts, Modes of Payment (Kashier / InstaPay / cash), Items from `Service`, Item Groups from `ServiceCategory`, Territories from `Area`. Accountant owns the chart; the engineer does not invent account structures.
**Exit:** accountant signs off that the chart matches how they file.

### Sprint 4 — The manual month *(1 month · calendar time · accountant only)*
**No integration. No code.** The accountant runs one full month by hand, entering bookings, expenses, and payouts directly.
**Exit:** one clean month closed in ERPNext, by hand. **This is the cheapest possible way to discover ERPNext doesn't fit — before a line of sync code exists.** If it doesn't fit, you've spent ~$30 and a month, not a quarter.

### Sprint 5 — Sync, dark *(1 week · engineer)*
`ErpSyncRecord` migration; the `/api/internal/erp/sync` route; `anees_ref` custom fields; `OnlineBooking` → Sales Invoice + Payment Entry. **`ERP_SYNC_ENABLED=false`** — dry-run mode logs what it *would* write.
**Exit:** dry-run output for the manual month **matches the accountant's hand-entered figures**. Discrepancies explained, not hand-waved. Idempotency proven by running twice and confirming zero duplicates.

### Sprint 6 — Sync, live + parallel run *(2 weeks · engineer + accountant)*
Flip `ERP_SYNC_ENABLED=true`. Sync writes for real **while the accountant continues entering by hand**. Compare daily.
**Exit:** two consecutive weeks where automated and manual figures agree to the piastre. Then, and only then, the accountant stops double-entering.

### Sprint 7 — Refunds + cancellation fees *(1 week · engineer)*
`Refund` → Credit Note + outgoing Payment Entry. `feeEgp` → the "Cancellation fees" income account (§9.2 — the easy-to-get-wrong one).
**Exit:** a real refund flows end-to-end and the fee lands in **revenue**, not netted against the refund.

### Sprint 8 — Expenses + provider payouts *(ongoing · accountant-led)*
Hand-entered in ERPNext (§9.3 — no Anees data exists to sync). **This is where the ERP starts paying for itself**: for the first time, provider payouts and expenses live in a real ledger.
**Exit:** a month closes with revenue, expenses, and payouts all present. **This is the first true P&L Anees has ever produced.**

### Sprint 9 — Payroll *(4–8 weeks · optional · defer by default)*
Only for `Provider.paymentType = salary` and salaried `Staff`. Dominated by Egyptian social insurance and income tax rules, not software.
**Exit:** one payroll run reconciled against the manual process.

### Sprint 10 — Cleanup *(0.5 day · track separately)*
Delete `Invoice`, `Payment`, `Expense`, `ProviderPayout` from `prisma/schema.prisma` (§1, consequence 4). Fix `features/admin/analytics/data.ts`, which currently sums an empty `Payment` table and reports it as revenue.
**Exit:** no dead financial models; analytics reads a real source.

---

## 12. Timeline

| Milestone | Elapsed |
|---|---|
| Gates answered | Week 1 |
| **Accountant logged in, backups tested** | **Week 2** |
| Chart of accounts signed off | Week 4 |
| **Manual month closed by hand** | **Week 8** |
| Sync proven in dry-run | Week 9 |
| **Sync live and trusted; hand-entry stops** | **Week 11 (~3 months)** |
| Refunds + fees correct | Week 12 |
| First true P&L (revenue + expenses + payouts) | ~Month 4 |
| Payroll *(optional)* | ~Month 6 |

**Read the shape of this, not the numbers.** Roughly **3 weeks of engineering** are spread across **3 months of calendar time**. The gap is not slack — it is the accountant learning the system and proving the numbers, which cannot be compressed and must not be skipped.

**The timeline is set by G2, not by the engineer.** With an engaged accountant: ~3 months. Without one: infinite, because it never actually gets used.

---

## 13. Security

- Mandatory **2FA**, every user, no exceptions.
- Firewall: **443 only**, plus SSH restricted to known IPs. ERPNext itself binds to `127.0.0.1` behind Nginx.
- fail2ban.
- **Tiny user list.** Fewer users than any other system you run. Every account is a person, never a shared "accounting" login.
- Secrets (`ERP_API_KEY`, `ERP_API_SECRET`, `CRON_SECRET`) live in Vercel env vars. **Never logged**, per the existing house rule.
- The ERPNext API user is a **dedicated service account**, permissioned to only the DocTypes it writes — not an Administrator token.
- Monthly OS patching; ERPNext upgrades tested against a backup restore first (see §16, R3).
- **Optional upgrade, out of scope for now:** if the domain's DNS ever moves to Cloudflare, Cloudflare Access/Tunnel could remove the ERP from the public internet entirely. This needs the whole domain on Cloudflare DNS (currently Vercel) — a separate decision, not bundled here.

---

## 14. Backups & DR

| | |
|---|---|
| What | Nightly MariaDB dump + the `sites/` directory (attachments, site config) |
| Where | **Cloudflare R2**, separate bucket from medical documents |
| Retention | ≥ 30 days |
| Encryption | At rest in R2 |
| **Restore drill** | **Quarterly, mandatory, onto a throwaway box** |
| RPO | 24h (acceptable — Anees can regenerate revenue data via re-sync) |
| RTO | ~4h (rebuild from Docker + restore dump) |

**Why the RPO is tolerable:** ERPNext is downstream (invariant #4). Lose a day of ERPNext and you re-run the sync. Lose the accountant's hand-entered expenses and payouts and **those are gone forever** — they exist nowhere else. That asymmetry is exactly why §14 is not optional and why Sprint 2 comes before Sprint 3.

---

## 15. Cost

| Item | Cost |
|---|---|
| ERPNext licence | **$0** (GPLv3) |
| VPS (8 GB) | ~$15–30/month |
| Backups to R2 | ~$0 (existing account, negligible volume) |
| TLS | $0 (Let's Encrypt) |
| Domain | $0 (subdomain of `aneeshealth.com`) |
| **Engineering** | ~3 weeks, spread over 3 months |
| **Accountant time** | **the real cost — and the one that decides success** |

"Free" means no licence fee. It does not mean free.

---

## 16. Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | **No accountant actually engages** → expensive unused server | **High** | Gate **G2**. Sprint 4's manual month surfaces this at week 8 for ~$30, before any sync is written. |
| R2 | **ETA integration is immature** → the main reason to have an ERP goes unmet | Medium | Gate **G1**, verified hands-on in Sprint 1. Can flip D1 to Odoo. |
| R3 | **ERPNext upgrade breaks the books** | Medium | Docker pinned to a tested tag; restore-tested backup before every upgrade; never upgrade during close. |
| R4 | **Sync double-books revenue** | Medium | `anees_ref` unique + `ErpSyncRecord` `@@unique` (§10.1–10.2); idempotency proven in Sprint 5; two-week parallel run in Sprint 6. |
| R5 | **Bus factor** — a fourth system needing a maintainer | **High** | Known standing P0 for this org. This plan **adds to it.** Docker + tested restores keep it recoverable by someone new. **Be honest that this makes the problem worse, not better.** |
| R6 | **Scope creep** — "let's just put visits in ERPNext too" | **High** | Invariants §8. ERPNext will happily let you. It will be worse than what you built, with none of your consent/audit/license gating. |
| R7 | **PDPL / residency drift** | Medium | Gate **G3**. Never decide the ERP's location independently of the clinical stack. |
| R8 | **Cancellation fee booked as a refund reduction** → understated revenue | Medium | Called out explicitly in §9.2; Sprint 7 exit criterion tests exactly this. |
| R9 | **`Patient.fullName` quietly ends up in the ERP** because it was convenient | Medium | §8.1. Mapping defaults to `Patient.code`. Names require a recorded decision under G1. |

---

## 17. Explicitly NOT doing

- ❌ **Patients, visits, clinical data, scheduling, or care plans in ERPNext.** Ever. (§8)
- ❌ **ERPNext as the patient-facing anything.** Anees is the product.
- ❌ **Building a real invoicing module inside Anees first.** That's building it twice. (§1)
- ❌ **Migrating off Kashier/InstaPay.** They stay; ERPNext just records the outcome.
- ❌ **Odoo** — unless gate G1 flips it. (D1)
- ❌ **`bench` install.** Docker only. (D4)
- ❌ **Postgres for ERPNext.** MariaDB. (§7)
- ❌ **Sharing the Hostinger VPS.** (§6)
- ❌ **Two-way sync.** Ever. (§8)
- ❌ **Inventory / stock.** Home care has no meaningful stock today. Revisit if medical supplies become material.
- ❌ **ERPNext CRM.** HubSpot-shaped scope creep; your funnel is `OnlineBooking`.
- ❌ **Blocking Metabase on any of this.** (D10)

---

## 18. Definition of done

1. Gates G1–G3 answered in writing, in this document.
2. `erp.aneeshealth.com` live on its own VPS, TLS, 2FA mandatory, firewall verified from outside.
3. Backups to R2 nightly, **with a restore drill actually performed**.
4. Chart of accounts signed off by the named accountant.
5. One month closed **by hand** before any sync existed.
6. Sync live, idempotent, audited, fail-closed; two-week parallel run agreed to the piastre.
7. Refunds produce Credit Notes; cancellation fees land in **revenue**.
8. One month closed with revenue **and** expenses **and** payouts — **the first true P&L Anees has produced.**
9. `Invoice`, `Payment`, `Expense`, `ProviderPayout` deleted from the schema; analytics no longer sums an empty table.
10. A written runbook (`deploy/erpnext/DEPLOY.md`) good enough that someone who has never seen the box can restore it.

---

## Appendix A — Decision log

| Date | Decision | By |
|---|---|---|
| 2026-07-17 | Doc created. ERPNext proposed over Odoo (D1). Discovered `Invoice`/`Payment`/`Expense`/`ProviderPayout` are empty; sync re-based onto `OnlineBooking` + `Refund` (§1). | Claude, with owner |
| | **G1 — ETA e-invoicing:** *unanswered* | |
| | **G2 — Named accountant:** *unanswered* | |
| | **G3 — Residency:** *unanswered* | |

## Appendix B — Facts to verify before trusting this doc

This plan is written from knowledge that may be stale. **Verify during Sprint 1 and correct here:**

1. Current stable ERPNext version (v15 assumed).
2. Whether an **Egypt chart-of-accounts template** ships with ERPNext.
3. **ETA e-invoicing** integration state for ERPNext (community) — actively maintained? Against the current ETA API?
4. Whether **Odoo's** `l10n_eg_edi_eta` is in **Community or Enterprise** — decides G1/R2.
5. Frappe's current **Postgres** support status (expected: still not recommended for ERPNext → §7 stands).
6. That ERPNext **multi-company** cleanly supports the `Tenant` mapping in §9.1.
