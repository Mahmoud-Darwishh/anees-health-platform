/**
 * Promocode validation + redemption helpers.
 *
 * Codes are stored uppercase. All lookups normalise via `normalizePromocode`.
 * Discount math is server-only — never trust client values.
 */

import type { Prisma, Promocode } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type PromocodeValidationError =
  | 'invalid'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit'
  | 'min_amount';

export type PromocodeValidationResult =
  | {
      ok: true;
      promocode: Promocode;
      baseAmountEgp: number;
      discountEgp: number;
      finalAmountEgp: number;
    }
  | { ok: false; error: PromocodeValidationError };

/** Trim + uppercase a user-supplied promocode for storage / lookup. */
export function normalizePromocode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Compute the discount in EGP for a given base amount.
 * - Percentage: `value%` of base, capped by `maxDiscountEgp` if set
 * - Fixed: flat `value` EGP off
 * Final amount is clamped at ≥ 1 EGP (Kashier rejects 0).
 */
export function computePromocodeDiscount(
  promo: Pick<Promocode, 'kind' | 'value' | 'maxDiscountEgp'>,
  baseAmountEgp: number
): { discountEgp: number; finalAmountEgp: number } {
  const value = Number(promo.value);
  const cap = promo.maxDiscountEgp != null ? Number(promo.maxDiscountEgp) : Infinity;

  let discount =
    promo.kind === 'percentage'
      ? Math.round(baseAmountEgp * (value / 100))
      : Math.round(value);

  if (discount < 0) discount = 0;
  if (discount > cap) discount = Math.round(cap);
  if (discount > baseAmountEgp) discount = baseAmountEgp;

  const final = Math.max(1, baseAmountEgp - discount);
  // Re-derive the effective discount after clamping the floor
  const effectiveDiscount = baseAmountEgp - final;

  return { discountEgp: effectiveDiscount, finalAmountEgp: final };
}

/**
 * Validate a code against the DB and compute the resulting amounts.
 * Does NOT increment usage — callers must do that inside the booking
 * transaction via `claimPromocodeWithinTx`.
 */
export async function validatePromocode(
  rawCode: string,
  baseAmountEgp: number
): Promise<PromocodeValidationResult> {
  const code = normalizePromocode(rawCode);
  if (!code) return { ok: false, error: 'invalid' };

  const promo = await prisma.promocode.findUnique({ where: { code } });
  if (!promo) return { ok: false, error: 'invalid' };
  if (!promo.isActive) return { ok: false, error: 'inactive' };

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) return { ok: false, error: 'not_started' };
  if (promo.expiresAt && promo.expiresAt < now) return { ok: false, error: 'expired' };

  if (promo.maxRedemptions != null && promo.redeemedCount >= promo.maxRedemptions) {
    return { ok: false, error: 'usage_limit' };
  }

  if (promo.minAmountEgp != null && baseAmountEgp < Number(promo.minAmountEgp)) {
    return { ok: false, error: 'min_amount' };
  }

  const { discountEgp, finalAmountEgp } = computePromocodeDiscount(promo, baseAmountEgp);

  return {
    ok: true,
    promocode: promo,
    baseAmountEgp,
    discountEgp,
    finalAmountEgp,
  };
}

/**
 * Atomically increment redeemedCount inside a Prisma transaction.
 * Re-checks `maxRedemptions` to defend against races.
 * Returns `true` on success, `false` if the limit was just reached.
 */
export async function claimPromocodeWithinTx(
  tx: Prisma.TransactionClient,
  promocodeId: string
): Promise<boolean> {
  const promo = await tx.promocode.findUnique({ where: { id: promocodeId } });
  if (!promo || !promo.isActive) return false;
  if (promo.maxRedemptions != null && promo.redeemedCount >= promo.maxRedemptions) {
    return false;
  }
  await tx.promocode.update({
    where: { id: promocodeId },
    data: { redeemedCount: { increment: 1 } },
  });
  return true;
}
