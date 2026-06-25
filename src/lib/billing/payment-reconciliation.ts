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
 * (piastres, ×100). Because the exact Kashier unit is environment-dependent, a
 * value matching at 1×, 100×, or 1/100× scale is treated as a MATCH so we don't
 * flood finance with false positives. The trade-off: a genuine ~100× over/under
 * charge reads as a unit difference. Once the live Kashier unit is confirmed
 * (one test transaction), tighten `scaleFactors` to `[1]` for maximum sensitivity.
 */

export type PaymentReconciliationReason =
  | 'match'
  | 'amount_mismatch'
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
const scaleFactors = [1, 100, 1 / 100];

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

  const amountMatches = scaleFactors.some(
    (factor) => Math.abs(gatewayAmount - expectedAmountEgp * factor) <= AMOUNT_TOLERANCE,
  );
  if (!amountMatches) {
    return { ...base, matched: false, reason: 'amount_mismatch' };
  }

  if (expectedCurrency && gatewayCurrency && expectedCurrency !== gatewayCurrency) {
    return { ...base, matched: false, reason: 'currency_mismatch' };
  }

  return { ...base, matched: true, reason: 'match' };
}
