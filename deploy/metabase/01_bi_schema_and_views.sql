-- =============================================================================
-- Anees Health · Metabase · Phase 1 (part 1 of 2): the `bi` schema + masked views
-- =============================================================================
-- WHAT THIS IS
--   Metabase talks straight to Postgres and therefore BYPASSES every app-layer
--   safety rule (tenant scoping, RBAC, PHI masking, audit). This file builds the
--   ONLY surface Metabase is ever allowed to read: a set of curated views in a
--   dedicated `bi` schema, with all direct patient identifiers stripped out.
--
-- HOW TO RUN
--   • Run as the DATABASE OWNER (the `anees_user` in DATABASE_URL). Views execute
--     with the owner's privileges on the underlying tables, so the read-only
--     Metabase user (created in 02_readonly_role.sql) never needs any grant on
--     `public`.
--   • Idempotent: safe to re-run (CREATE SCHEMA IF NOT EXISTS / CREATE OR REPLACE).
--   • Wrapped in a transaction — it all applies or none of it does.
--
-- CONVENTIONS THAT MATTER HERE
--   • Table names are snake_case (e.g. public.patients).
--   • COLUMN names are camelCase with NO @map, so every column MUST be
--     double-quoted ("gpsLatitude"). An un-quoted name is folded to lowercase and
--     will either error or resolve wrong — that is exactly how a "masked" view
--     could silently leak a real column, so every column below is quoted.
--   • Money is Decimal EGP. Views expose it unchanged.
--
-- NEVER expose (no view here, no grant anywhere): users, accounts,
--   verification_tokens, push_subscriptions, staff, physio_profiles,
--   visit_location_pings, visit_state_transitions, controlled_substance_ledger,
--   standing_orders, standing_order_executions, patient_goals,
--   destructive_approval_tokens, profile_change_requests, rate_limits,
--   audit_logs (its JSON snapshots can contain any PHI) — and ANYTHING in Medplum.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS bi;
COMMENT ON SCHEMA bi IS 'Read-only, PHI-masked reporting views for Metabase. The Metabase role may read ONLY this schema.';

-- -----------------------------------------------------------------------------
-- PHI-BEARING TABLES → curated views (identifiers stripped)
-- -----------------------------------------------------------------------------

-- Patients: identity-free. Age BAND instead of birth date; no name/phone/ID/GPS/
-- insurance/contacts/clinical free-text. Soft-deleted patients excluded.
CREATE OR REPLACE VIEW bi.patients_safe AS
SELECT
  p.id,
  p.code,
  p."areaId",
  p."gender",
  CASE
    WHEN p."dateOfBirth" IS NULL THEN 'unknown'
    WHEN date_part('year', age(p."dateOfBirth")) < 18 THEN '0-17'
    WHEN date_part('year', age(p."dateOfBirth")) < 40 THEN '18-39'
    WHEN date_part('year', age(p."dateOfBirth")) < 60 THEN '40-59'
    WHEN date_part('year', age(p."dateOfBirth")) < 80 THEN '60-79'
    ELSE '80+'
  END AS age_band,
  p."status",
  p."referralSourceId",
  p."privacyTier",
  p."tenantId",
  p."registrationDate",
  p."createdAt"
FROM public.patients p
WHERE p."deletedAt" IS NULL;
COMMENT ON VIEW bi.patients_safe IS 'Patients with all direct identifiers removed (no name/phone/nationalId/GPS/insurance); dateOfBirth reduced to age_band; soft-deleted excluded.';

-- Visits: financials, timing, status, rating. GPS + identity + media stripped.
CREATE OR REPLACE VIEW bi.visits_safe AS
SELECT
  v.id,
  v.code,
  v."patientId",
  v."providerId",
  v."serviceId",
  v."carePlanId",
  v."areaId",
  v."bookedDate",
  v."scheduledDate",
  v."completedDatetime",
  v."status",
  v."state",
  v."visitType",
  v."primaryDisruptionCode",
  v."servicePriceEgp",
  v."discountEgp",
  v."netPriceEgp",
  v."providerPayoutEgp",
  v."cashCollectedEgp",
  v."cashGratuityEgp",
  v."patientRating",
  v."tenantId",
  v."createdAt"
FROM public.visits v;
-- Deliberately omitted: checkInLat/Lng, checkOutLat/Lng, identityConfirmedBy,
-- companionsPresent, overridePhotoMediaId, patientAcknowledgementMediaId, notes.
COMMENT ON VIEW bi.visits_safe IS 'Visit financials/timing/status/rating. GPS coordinates, identity-confirmation, media ids and free-text notes removed.';

-- Online bookings: funnel + payment rail. Name/phone/IP/UA/sender stripped.
CREATE OR REPLACE VIEW bi.bookings_safe AS
SELECT
  b.id,
  b."bookingRef",
  b."visitType",
  b."serviceType",
  b."packageType",
  b."specialty",
  b."baseAmountEgp",
  b."discountEgp",
  b."amountEgp",
  b."currency",
  b."status",
  b."paymentMethod",
  b."governorate",
  b."promocodeCode",
  b."convertedVisitId",
  b."convertedAt",
  b."paymentCompletedAt",
  b."locale",
  b."tenantId",
  b."createdAt"
FROM public.online_bookings b;
-- Omitted: fullName, phoneNumber, countryCode, ipAddress, userAgent,
-- instapaySenderName, instapayReference, notes, kashier* ids.
COMMENT ON VIEW bi.bookings_safe IS 'Website booking funnel + payment rail. Names, phone, IP/user-agent, InstaPay sender and gateway ids removed.';

-- Care plans: program economics. Free-text notes dropped.
CREATE OR REPLACE VIEW bi.care_plans_safe AS
SELECT
  c.id, c.code, c."patientId", c."planName",
  c."startDate", c."endDate", c."totalVisitsPlanned", c."totalPriceEgp",
  c."status", c."tenantId", c."createdAt"
FROM public.care_plans c;

-- Invoices: AR. Free-text notes dropped.
CREATE OR REPLACE VIEW bi.invoices_safe AS
SELECT
  i.id, i.code, i."patientId", i."invoiceDate", i."linkedType",
  i."linkedVisitId", i."linkedCarePlanId",
  i."grossAmountEgp", i."discountPct", i."netAmountEgp",
  i."dueDate", i."status", i."tenantId", i."createdAt"
FROM public.invoices i;

-- Payments: cash-in. Free-text notes dropped (referenceNumber/receivedBy kept — not patient PHI).
CREATE OR REPLACE VIEW bi.payments_safe AS
SELECT
  p.id, p.code, p."invoiceId", p."patientId", p."paymentDate",
  p."amountEgp", p."paymentMethodId", p."referenceNumber", p."receivedBy", p."createdAt"
FROM public.payments p;

-- Expenses: cost-out. Free-text notes dropped.
CREATE OR REPLACE VIEW bi.expenses_safe AS
SELECT
  e.id, e.code, e."expenseDate", e."categoryId", e."subcategory", e."vendorPayee",
  e."amountEgp", e."paymentMethodId", e."linkedVisitId", e."linkedProviderId",
  e."receiptRef", e."createdAt"
FROM public.expenses e;

-- Provider payouts: labour cost. Free-text notes dropped.
CREATE OR REPLACE VIEW bi.provider_payouts_safe AS
SELECT
  pp.id, pp.code, pp."providerId", pp."periodStart", pp."periodEnd", pp."payoutDate",
  pp."totalVisits", pp."grossAmountEgp", pp."deductionsEgp", pp."netAmountEgp",
  pp."paymentMethodId", pp."referenceNumber", pp."createdAt"
FROM public.provider_payouts pp;

-- Refunds: refund ledger. Free-text reasonNote dropped (reasonCode kept).
CREATE OR REPLACE VIEW bi.refunds_safe AS
SELECT
  r.id, r."bookingRef", r."patientId", r."amountPaidEgp", r."feeEgp", r."refundEgp",
  r."reasonCode", r."method", r."status", r."completedAt", r."tenantId", r."createdAt"
FROM public.refunds r;

-- Providers (staff clinicians): drop contact details (phone/email). fullName kept
-- for dashboard labels — these are staff, not patients.
CREATE OR REPLACE VIEW bi.providers_safe AS
SELECT
  p.id, p.code, p."fullName", p."roleId", p."specialty",
  p."primaryAreaId", p."status", p."tenantId", p."createdAt"
FROM public.providers p;

-- Insurance chain. Member/policy identifiers + free-text stripped; amounts/status kept.
CREATE OR REPLACE VIEW bi.coverages_safe AS
SELECT
  c.id, c."patientId", c."insurerProfileId", c."planName", c."status",
  c."startsAt", c."expiresAt", c."tenantId", c."createdAt"
FROM public.coverages c;
-- Dropped: memberId, policyNumber, metadata (Json).

CREATE OR REPLACE VIEW bi.prior_auths_safe AS
SELECT
  pa.id, pa."patientId", pa."insurerProfileId", pa."status",
  pa."submittedAt", pa."resolvedAt", pa."expiresAt", pa."tenantId", pa."createdAt"
FROM public.prior_auths pa;
-- Dropped: referenceNumber, requestedFor (may carry clinical context), notes.

CREATE OR REPLACE VIEW bi.claims_safe AS
SELECT
  cl.id, cl.code, cl."patientId", cl."visitId", cl."insurerProfileId", cl."priorAuthId",
  cl."status", cl."submittedAt", cl."adjudicatedAt",
  cl."totalAmountEgp", cl."approvedAmountEgp", cl."tenantId", cl."createdAt"
FROM public.claims cl;
-- Dropped: deniedReason (free-text — may carry clinical context). If you need a
-- "denial reason mix" dashboard, add a REVIEWED, categorised column instead of
-- exposing the raw free-text.

CREATE OR REPLACE VIEW bi.claim_line_items_safe AS
SELECT
  li.id, li."claimId", li."serviceCode", li."quantity",
  li."unitPriceEgp", li."amountEgp", li."status", li."createdAt"
FROM public.claim_line_items li;
-- Dropped: description, notes (free-text line detail).

CREATE OR REPLACE VIEW bi.insurer_profiles_safe AS
SELECT
  ip.id, ip.code, ip.name, ip."payerType", ip."supportsDirectBilling",
  ip."isActive", ip."createdAt"
FROM public.insurer_profiles ip;
-- Dropped: notes.

-- Coverage-check telemetry — already PII-free (IP is SHA-256 hashed). Pass-through.
CREATE OR REPLACE VIEW bi.coverage_checks AS
SELECT * FROM public.coverage_checks;

-- -----------------------------------------------------------------------------
-- PHI-FREE LOOKUP / DIMENSION TABLES → pass-through views
-- (Everything Metabase can see lives in `bi`, so the boundary is one schema.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW bi.services            AS SELECT * FROM public.services;
CREATE OR REPLACE VIEW bi.areas               AS SELECT * FROM public.areas;
CREATE OR REPLACE VIEW bi.service_categories  AS SELECT * FROM public.service_categories;
CREATE OR REPLACE VIEW bi.provider_roles      AS SELECT * FROM public.provider_roles;
CREATE OR REPLACE VIEW bi.payment_methods     AS SELECT * FROM public.payment_methods;
CREATE OR REPLACE VIEW bi.expense_categories  AS SELECT * FROM public.expense_categories;
CREATE OR REPLACE VIEW bi.referral_sources    AS SELECT * FROM public.referral_sources;
CREATE OR REPLACE VIEW bi.booking_prices      AS SELECT * FROM public.booking_prices;
CREATE OR REPLACE VIEW bi.specialties         AS SELECT * FROM public.specialties;
CREATE OR REPLACE VIEW bi.promocodes          AS SELECT * FROM public.promocodes;
CREATE OR REPLACE VIEW bi.tenants             AS SELECT * FROM public.tenants;

COMMIT;

-- Next: run 02_readonly_role.sql to create the read-only login, then
-- 03_verify_boundary.sql to PROVE the boundary before connecting Metabase.
