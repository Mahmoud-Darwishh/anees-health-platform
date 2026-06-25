import { describe, it, expect } from 'vitest';
import { reconcilePaymentAmount } from '@/lib/billing/payment-reconciliation';

describe('reconcilePaymentAmount', () => {
  it('matches when the gateway charged the booked amount (major units)', () => {
    const r = reconcilePaymentAmount({
      expectedAmountEgp: 1500,
      expectedCurrency: 'EGP',
      gatewayAmount: 1500,
      gatewayCurrency: 'EGP',
    });
    expect(r.matched).toBe(true);
    expect(r.reason).toBe('match');
  });

  it('matches when the gateway reports minor units (×100)', () => {
    const r = reconcilePaymentAmount({
      expectedAmountEgp: 1500,
      gatewayAmount: 150000,
    });
    expect(r.matched).toBe(true);
    expect(r.reason).toBe('match');
  });

  it('flags a genuine amount mismatch (underpayment)', () => {
    const r = reconcilePaymentAmount({
      expectedAmountEgp: 1500,
      gatewayAmount: 900,
      gatewayCurrency: 'EGP',
    });
    expect(r.matched).toBe(false);
    expect(r.reason).toBe('amount_mismatch');
  });

  it('flags a currency mismatch even when the amount matches', () => {
    const r = reconcilePaymentAmount({
      expectedAmountEgp: 1500,
      expectedCurrency: 'EGP',
      gatewayAmount: 1500,
      gatewayCurrency: 'USD',
    });
    expect(r.matched).toBe(false);
    expect(r.reason).toBe('currency_mismatch');
  });

  it('flags a missing gateway amount as unverifiable', () => {
    const r = reconcilePaymentAmount({
      expectedAmountEgp: 1500,
      gatewayAmount: null,
    });
    expect(r.matched).toBe(false);
    expect(r.reason).toBe('missing_gateway_amount');
  });

  it('tolerates floating-point noise within 0.01', () => {
    const r = reconcilePaymentAmount({
      expectedAmountEgp: 99.99,
      gatewayAmount: 99.995,
    });
    expect(r.matched).toBe(true);
  });
});
