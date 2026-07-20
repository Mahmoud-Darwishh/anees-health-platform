-- =============================================================================
-- Anees Health · Metabase · starter dashboard queries
-- =============================================================================
-- Paste each into a Metabase "SQL question" (admins only — non-admin groups are
-- query-builder-only). They read ONLY the masked bi.* views. Enum label values
-- (e.g. 'completed', 'paid') are illustrative — check them against your actual
-- data the first time and adjust. Business definitions match the app's code.
-- =============================================================================

-- 1) Revenue by month
--    Definition: revenue = money actually received (card + confirmed InstaPay),
--    i.e. rows in `payments`. Matches the app's Owner-Analytics revenue figure.
SELECT date_trunc('month', "paymentDate")::date AS month,
       SUM("amountEgp")                          AS revenue_egp,
       COUNT(*)                                  AS payments
FROM bi.payments_safe
GROUP BY 1
ORDER BY 1;

-- 2) Booking funnel — where bookings sit right now
SELECT "status", COUNT(*) AS bookings, SUM("amountEgp") AS value_egp
FROM bi.bookings_safe
GROUP BY 1
ORDER BY 2 DESC;

-- 3) Booking → paid conversion, by month
--    A booking "converted" once it produced a visit (convertedVisitId set).
SELECT date_trunc('month', "createdAt")::date AS month,
       COUNT(*)                                AS bookings,
       COUNT("convertedVisitId")               AS converted,
       ROUND(100.0 * COUNT("convertedVisitId") / NULLIF(COUNT(*), 0), 1) AS conversion_pct
FROM bi.bookings_safe
GROUP BY 1
ORDER BY 1;

-- 4) Demand by governorate (where the interest is)
SELECT COALESCE("governorate", '(unknown)') AS governorate, COUNT(*) AS bookings
FROM bi.bookings_safe
GROUP BY 1
ORDER BY 2 DESC;

-- 5) Visits completed per month + average patient rating
SELECT date_trunc('month', "scheduledDate")::date               AS month,
       COUNT(*) FILTER (WHERE "status" = 'completed')           AS completed_visits,
       ROUND(AVG("patientRating"), 2)                           AS avg_rating
FROM bi.visits_safe
GROUP BY 1
ORDER BY 1;

-- 6) Clinician utilization — top clinicians by completed visits
SELECT pr."fullName"                                              AS clinician,
       COUNT(*) FILTER (WHERE v."status" = 'completed')          AS completed_visits,
       SUM(v."providerPayoutEgp") FILTER (WHERE v."status" = 'completed') AS payout_egp
FROM bi.visits_safe v
JOIN bi.providers_safe pr ON pr.id = v."providerId"
GROUP BY 1
ORDER BY 2 DESC
LIMIT 15;

-- 7) Accounts-receivable aging — unpaid invoices by overdue bucket
SELECT CASE
         WHEN "dueDate" IS NULL                       THEN 'no due date'
         WHEN "dueDate" >= CURRENT_DATE               THEN 'not yet due'
         WHEN "dueDate" >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 days overdue'
         WHEN "dueDate" >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days overdue'
         ELSE '60+ days overdue'
       END                          AS bucket,
       COUNT(*)                     AS invoices,
       SUM("netAmountEgp")          AS amount_egp
FROM bi.invoices_safe
WHERE "status" <> 'paid'
GROUP BY 1
ORDER BY 1;

-- 8) Insurance — claim approval rate by month
SELECT date_trunc('month', "submittedAt")::date AS month,
       COUNT(*)                                  AS claims,
       SUM("totalAmountEgp")                     AS submitted_egp,
       SUM("approvedAmountEgp")                  AS approved_egp,
       ROUND(100.0 * SUM("approvedAmountEgp") / NULLIF(SUM("totalAmountEgp"), 0), 1) AS approval_pct
FROM bi.claims_safe
WHERE "submittedAt" IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- 9) Coverage-area demand — covered vs not covered
SELECT "covered", COUNT(*) AS checks
FROM bi.coverage_checks
GROUP BY 1;

-- 10) Promocode effectiveness
SELECT "code", "kind", "value", "redeemedCount"
FROM bi.promocodes
ORDER BY "redeemedCount" DESC;
