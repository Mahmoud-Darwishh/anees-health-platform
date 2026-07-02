/**
 * Reconcile the amount a payment gateway reports it charged against the amount
 * we booked, BEFORE writing it to the ledger.
 *
 * The Kashier webhook payload is HMAC-signed, so `data.amount` is trustworthy —
 * but we previously never compared it to the booked price, so a partial capture,
 * currency drift, or gateway-side adjustment would be recorded as a clean "paid"
 * invoice for the expected figure. This helper surfaces that discrepancy so the
 * webhook can flag + audit it for finance review (it never rejects the payment —
 * money was received — and never silently books the expected figure).
 *
 * Gateways differ on units: some report major units (EGP), some minor units
 * (piastres, ×100). Only an EXACT-scale match (gateway reports the same unit we
 * booked in) is treated as a clean pass. A value that matches ONLY at a 100× or
 * 1/100× scale is reported as a `unit_mismatch` (matched=false) so it is flagged
 * for finance review rather than silently accepted — this closes the hole where a
 * genuine ~100× over/under charge was read as a harmless unit difference. If a
 * future gateway/env genuinely reports minor units, normalise the amount at the
 * call site before reconciling instead of re-widening the tolerance here.
 */

export type PaymentReconciliationReason =
  | 'match'
  | 'amount_mismatch'
  | 'unit_mismatch'
  | 'currency_mismatch'
  | 'missing_gateway_amount';

export type PaymentReconciliation = {
  matched: boolean;
  reason: PaymentReconciliationReason;
  expectedAmountEgp: number;
  gatewayAmount: number | null;
  expectedCurrency: string | null;
  gatewayCurrency: string | null;
};

const AMOUNT_TOLERANCE = 0.01;

export function reconcilePaymentAmount(input: {
  expectedAmountEgp: number;
  expectedCurrency?: string | null;
  gatewayAmount?: number | null;
  gatewayCurrency?: string | null;
}): PaymentReconciliation {
  const expectedAmountEgp = Number(input.expectedAmountEgp);
  const parsedGateway = input.gatewayAmount == null ? NaN : Number(input.gatewayAmount);
  const gatewayAmount = Number.isFinite(parsedGateway) ? parsedGateway : null;
  const expectedCurrency = input.expectedCurrency?.trim().toUpperCase() || null;
  const gatewayCurrency = input.gatewayCurrency?.trim().toUpperCase() || null;

  const base = { expectedAmountEgp, gatewayAmount, expectedCurrency, gatewayCurrency };

  if (gatewayAmount === null) {
    return { ...base, matched: false, reason: 'missing_gateway_amount' };
  }

  const exactMatch = Math.abs(gatewayAmount - expectedAmountEgp) <= AMOUNT_TOLERANCE;
  const unitScaledMatch =
    !exactMatch &&
    [100, 1 / 100].some(
      (factor) => Math.abs(gatewayAmount - expectedAmountEgp * factor) <= AMOUNT_TOLERANCE,
    );

  if (!exactMatch && !unitScaledMatch) {
    return { ...base, matched: false, reason: 'amount_mismatch' };
  }
  // Matches only at a 100×/0.01× scale → flag for review, never a silent pass.
  if (unitScaledMatch) {
    return { ...base, matched: false, reason: 'unit_mismatch' };
  }

  if (expectedCurrency && gatewayCurrency && expectedCurrency !== gatewayCurrency) {
    return { ...base, matched: false, reason: 'currency_mismatch' };
  }

  return { ...base, matched: true, reason: 'match' };
}
