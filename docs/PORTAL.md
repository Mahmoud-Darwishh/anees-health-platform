# Patient Portal — Current Status

The **Patient Portal** is the bilingual, locale-aware self-service area where authenticated patients view their own EHR data, manage upcoming visits, see invoices, and download clinical documents. It is the patient-facing counterpart to the internal admin / clinician dashboard at `/admin`.

> **Live route:** `/[locale]/portal` (e.g. `/en/portal`, `/ar/portal`)
> **Auth:** NextAuth v5 — `session.user.role === 'patient'` required.
> **Data scope:** A patient only ever sees rows where `patientId === session.user.patientId`.

---

## 1. Routes

| Path | Purpose |
|---|---|
| `/[locale]/auth/login` | Patient & caregiver login (NextAuth) |
| `/[locale]/auth/signup` | Patient self-registration |
| `/[locale]/auth/link-account` | Link a new login to an existing patient record |
| `/[locale]/auth/error` | NextAuth error page |
| `/[locale]/portal` | Portal dashboard (all sections live here, tab-switched in-page) |
| `/[locale]/portal/documents/[id]` | Single document detail view |
| `/api/portal/documents/[id]/file` | Authenticated streaming endpoint for private files (PDF/JPEG/PNG/WEBP/DICOM) |
| `/caregiver/login` | Caregiver login entry point |
| `/caregiver/patient/[id]` | Caregiver-scoped patient view (scaffolded) |

The portal page is RTL/LTR aware via `next-intl`; `dir` is set once on `<html>` in [`src/app/[locale]/layout.tsx`](src/app/%5Blocale%5D/layout.tsx).

---

## 2. Sections (single-page, tab-switched)

The portal dashboard is composed of 7 tabbed sections rendered by [`PortalShell`](src/features/portal/components/PortalShell.tsx):

| ID | Tab | What's inside |
|---|---|---|
| `overview` | Overview | Summary metrics (total visits, active meds, outstanding balance, documents), visit-trend sparkline, document mix, billing ring, clinical disclaimer |
| `profile` | Master Profile | Demographics, contact, address, blood group, caregiver phone, map URL |
| `visits` | Visits | All past + upcoming visits with status, provider, date, type. Patient can confirm / request reschedule / request cancel from the row |
| `medical` | Medical | Allergies, current & historical medications, diagnoses, vital signs, progress notes |
| `labs` | Labs & Imaging | Documents grouped: labs, scans, other. Each document links to the authenticated stream endpoint |
| `financial` | Financial | Invoices, paid vs. outstanding, payments, total billed |
| `care` | Care Plan | Care plan, care team, care tasks, messages from the team |

A bilingual language switcher and PWA install prompt are wired into the `PortalShell` header.

---

## 3. Data sources

All reads happen server-side from the Prisma singleton (`@/lib/db/prisma`). The patient is resolved from the NextAuth session — no patient ID is ever passed through the URL or query string.

Models read by the portal:

- `Patient` — demographics, contact, caregiver, address, map URL, blood group
- `Visit` — past + upcoming visits (joined with `Provider`, `Service`, `Area`)
- `Allergy`, `Medication`, `Diagnosis`, `VitalSigns`, `ProgressNote` — clinical history
- `Document` — labs, scans, discharge summaries, consents, insurance (filtered `deletedAt: null`)
- `Invoice`, `Payment` — financial overview
- `CarePlan`, `CareTask`, `CareTeamMessage` — care coordination
- `StaffAssignment` — care team display (provider / nurse / physio assigned to the patient)

All queries are scoped by `patientId = session.user.patientId`. Soft-deleted clinical rows (`deletedAt: null`) are filtered out.

---

## 4. Mutations (server actions)

Defined in [`src/app/[locale]/portal/actions.ts`](src/app/%5Blocale%5D/portal/actions.ts):

- `requestVisitChange(visitId, type)` — `'confirm' | 'reschedule' | 'cancel'`. Writes through `getAuditedPrisma(...)` so an `AuditLog` row is emitted in the same transaction.
- Profile edits (caregiver phone, address map URL) — audited create/update on `Patient`.

Every mutation:
1. Re-resolves the session and re-checks `session.user.role === 'patient'`.
2. Asserts the target row's `patientId` matches the session's `patientId` (no IDOR).
3. Writes through `getAuditedPrisma(session.user.id)` so the audit log fires automatically.
4. Calls `revalidatePath('/[locale]/portal')` and (optionally) redirects with `?updated=...` / `?error=...`.

---

## 5. Document delivery (private file storage)

PHI documents are **never** served from `public/`. They live under the private storage root (`EHR_STORAGE_ROOT`, defaults to `./private-storage/ehr` for local dev) at:

```
{patientId}/{yyyy}/{mm}/{uuid}-{safe-filename}
```

**Streaming endpoint:** [`src/app/api/portal/documents/[id]/file/route.ts`](src/app/api/portal/documents/%5Bid%5D/file/route.ts)

- Rate-limited 60 req/min/IP via `checkRateLimit`
- Requires `session.user.role === 'patient'` AND `doc.patientId === session.user.patientId`
- Headers: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`
- `Content-Disposition` honours `?download=1`
- Node runtime, `force-dynamic`

Uploads are **staff-only** (`/admin/patients/[id]/documents` UI → `POST /api/admin/patients/[id]/documents`). Patients only read.

---

## 6. Authentication

NextAuth v5 (Auth.js) is installed and live ([`src/auth.ts`](src/auth.ts)). Session shape:

```ts
session.user.id          // NextAuth user id
session.user.role        // 'patient' | 'staff'
session.user.patientId   // when role === 'patient'
session.user.staffId     // when role === 'staff'
session.user.staffRole   // StaffRole enum
```

Patients authenticate via the bilingual `/auth/login` page. Caregivers have a separate `/caregiver/login` entry. Account linking is supported for patients who need multiple logins (e.g. patient + adult child).

---

## 7. Bilingual / RTL

- All copy lives in `messages/en.json` → `portal.*` and `messages/ar.json` → `portal.*`. **No hardcoded strings.**
- Server components: `getTranslations({ locale, namespace: 'portal' })`
- Client components: `useTranslations('portal')`
- Numbers, dates, currency are formatted with `Intl.NumberFormat` / `Intl.DateTimeFormat` using `Africa/Cairo` time zone.
- Layout direction is set once on `<html dir>` in `[locale]/layout.tsx`.

---

## 8. PWA

The portal participates in the PWA shell defined in `next.config.ts` (`@ducanh2912/next-pwa` + `worker/index.ts`):

- Locale-aware manifests: `/manifest-en.webmanifest`, `/manifest-ar.webmanifest`
- Push subscriptions persisted in `PushSubscription` (Postgres)
- Offline fallback at `~offline/`
- Install prompt component embedded in `PortalShell`

---

## 9. Security posture

- Server-only logic stays out of `'use client'` files; no secrets reach the browser.
- Every API route response goes through `resolveCorsHeaders()`.
- Every mutation route is rate-limited per IP via `checkRateLimit`, backed by the `RateLimit` table.
- All writes on audited models (Patient, Document, Visit, MedicalHistory, Allergy, Medication, Diagnosis, VitalSigns, ProgressNote, CarePlan, CareTask, CareTeamMessage, …) go through `getAuditedPrisma(changedBy)` → automatic `AuditLog` row.
- Clinical records use soft-delete only (`deletedAt DateTime?`).
- Logs never contain PHI — IDs only.
- Document files have mode `0o640`, served only via authenticated stream.

---

## 10. UI primitives (feature-scoped)

In [`src/features/portal/components/`](src/features/portal/components):

- `PortalShell.tsx` — top-level layout: language switcher, role-aware nav, mobile tab bar, install prompt, content frame.
- `PortalSectionCard.tsx` — titled card with subtitle, used for every section panel.
- `PortalMetricCard.tsx` — KPI tile (value, label, hint).
- `PortalDataTable.tsx` — accessible 2-col / multi-col data table.
- `ExportPdfButton.tsx` — client-side print/export hook (uses native `window.print` with a portal-specific stylesheet).

Charts come from the shared admin EHR module: `DistributionCard`, `SparklineCard`, `RingProgressCard` in [`src/components/admin/EhrCharts.tsx`](src/components/admin/EhrCharts.tsx).

Styling is SCSS modules + design tokens (no Tailwind). The portal's main stylesheet is [`portal.module.scss`](src/app/%5Blocale%5D/portal/portal.module.scss).

---

## 11. Known gaps / next steps

| # | Item | Status |
|---|---|---|
| 1 | Patient self-upload of documents | ⏳ Not yet built — staff-only upload today (`/admin/patients/[id]/documents`) |
| 2 | Push notification opt-in inside Portal | ✅ Available via `/[locale]/settings/pwa`; could be surfaced inline |
| 3 | Caregiver experience | 🟡 Login + landing route scaffolded; the dedicated caregiver shell is pending |
| 4 | Document view audit-log (read events) | ⏳ Writes are audited; views currently only emit `appLogger.info`. `// TODO(audit)` left in the stream route |
| 5 | DICOM in-browser viewer | ⏳ Today DICOM downloads only; viewer (cornerstone.js or similar) is a Phase-4 item |
| 6 | Migrations | ⏳ Still using `db:push`; switch to `prisma migrate` before any production PHI |
| 7 | Sentry / observability | ⏳ Planned |

---

## 12. Quick verification checklist

```bash
npm run dev          # http://localhost:3000/en/portal (and /ar/portal)
npx tsc --noEmit     # Type-check (must be clean)
npm run lint         # ESLint
npm run db:studio    # Inspect Document / Patient rows
```

To exercise the document flow end to end:

1. Sign in as a staff user → `/admin/patients/[id]/documents` → upload a PDF.
2. The file lands at `private-storage/ehr/{patientId}/{yyyy}/{mm}/{uuid}-{name}` (mode `0o640`).
3. A `Document` row is created with relative `storagePath`, SHA-256 `checksum`, MIME, size.
4. An `AuditLog` row is emitted automatically (`tableName='Document'`, `action='create'`).
5. Sign in as the patient who owns that record → `/[locale]/portal` → **Labs & Imaging** tab → click the document.
6. The browser receives the file via `/api/portal/documents/[id]/file` with `Cache-Control: private, no-store`.

---

## 13. File map

```
src/
├── app/
│   ├── [locale]/
│   │   ├── auth/                         # login, signup, link-account, error
│   │   └── portal/
│   │       ├── page.tsx                  # All 7 sections (tab-switched)
│   │       ├── portal.module.scss
│   │       ├── actions.ts                # Server actions (audited writes)
│   │       └── documents/[id]/page.tsx   # Single-document detail
│   ├── api/
│   │   └── portal/
│   │       └── documents/[id]/file/route.ts   # Authenticated streaming
│   └── caregiver/
│       ├── login/                        # Caregiver login
│       └── patient/[id]/                 # Caregiver patient view (scaffold)
│
├── features/portal/components/
│   ├── PortalShell.tsx
│   ├── PortalShell.module.scss
│   ├── PortalSectionCard.tsx
│   ├── PortalMetricCard.tsx
│   ├── PortalDataTable.tsx
│   └── ExportPdfButton.tsx
│
├── lib/
│   ├── auth/                             # requireStaffPermission, record-access
│   ├── db/
│   │   ├── prisma.ts                     # Singleton
│   │   └── audited-prisma.ts             # AuditLog Prisma extension
│   └── storage/file-storage.ts           # Private EHR file storage abstraction
│
└── messages/
    ├── en.json                           # portal.* namespace
    └── ar.json                           # portal.* namespace
```
