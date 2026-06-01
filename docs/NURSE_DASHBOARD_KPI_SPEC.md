# Nurse Dashboard KPI Spec (Business + Medical)

## 1) Route and module placement

- Admin route: `/admin/nursing/dashboard`
- Page file: `src/app/admin/nursing/dashboard/page.tsx`
- Feature module: `src/features/ehr/admin-nursing-dashboard/*`
- Shared clinical query helpers: `src/lib/medplum/care-reports.ts`, `src/lib/medplum/tasks.ts`

This keeps the dashboard role-specific while preserving reusable data loaders for future Doctor/Physio dashboards.

## 2) KPI domains

### A) Clinical quality KPIs (FHIR-backed)

1. Open Escalations Assigned
- Source: Medplum `Task` (escalation tasks) with owner = nurse Practitioner
- Logic: count of open workflow statuses
- Goal: safety and responsiveness visibility

2. Handoffs Submitted (30d)
- Source: Medplum `Observation` (`nursing-shift-handoff`)
- Logic: count where performer = nurse Practitioner in last 30 days
- Goal: continuity-of-care process adherence

3. On-site Handoff Rate
- Source: handoff `Observation.component`
- Logic: `within-patient-location-radius=yes` / total handoffs
- Goal: policy compliance for in-home handoff

4. Handoff Acknowledged (30d)
- Source: handoff `Observation.component`
- Logic: count with `incoming-nurse-acknowledged-at` present
- Goal: closed-loop shift transfer quality

### B) Operational KPIs (Prisma/Postgres)

1. Scheduled Visits (month)
- Source: `Visit` table
- Logic: count of nurse-linked provider visits in active workflow statuses

2. Completed Visits (month)
- Source: `Visit` table
- Logic: count where status = `completed`

3. Completion Rate
- Formula: completed visits / scheduled visits

4. No-show Visits (month)
- Source: `Visit` table
- Logic: count where status = `no_show`

5. Average Patient Rating (month)
- Source: `Visit.patientRating`
- Logic: average over completed visits only

### C) Financial KPIs (Prisma/Postgres)

1. Earned This Month
- Source: `Visit.providerPayoutEgp` on completed visits
- Logic: sum in current month

2. Paid This Month
- Source: `ProviderPayout.netAmountEgp`
- Logic: sum with `payoutDate` in current month

3. Pending Estimate
- Formula: max(Earned - Paid, 0)

4. Last Payout
- Source: latest `ProviderPayout` by date
- Logic: expose date and net amount for staff transparency

## 3) Access and security model

- Role access: `nurse`, `admin`, `superadmin`
- Identity map:
  - `Staff.providerId` for SQL KPIs
  - `Staff.medplumPractitionerId`/Practitioner mapping for FHIR KPIs
- PHI posture:
  - Dashboard defaults to aggregate metrics (no patient list by default)
  - Avoid identifiers in KPI cards
  - Keep patient-level drilldowns behind explicit role-guarded actions

## 4) Scalability and extension plan

1. Add period filters (today/week/month/custom) in data loader params.
2. Add trend snapshots table for historical KPI charts.
3. Split reusable worker-quality metrics into shared `provider-dashboard` service for nurse/doctor/physio reuse.
4. Add payout reconciliation panel against payroll exports.
5. Add SLA metrics for escalation acknowledgement and closure windows.

## 5) Current implementation status

- Read-only nurse dashboard shipped with Clinical + Operations + Finance KPI cards.
- KPI formulas and sources wired to existing schema and Medplum resources.
- Clinical block degrades gracefully if Medplum is temporarily unavailable.
