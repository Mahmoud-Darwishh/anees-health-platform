import 'server-only';

import { prisma } from '@/lib/db/prisma';

export type PendingPaymentItem = {
  bookingRef: string;
  fullName: string;
  phone: string;
  amountEgp: number;
  currency: string;
  instapayReference: string | null;
  instapaySenderName: string | null;
  governorate: string | null;
  createdAtIso: string;
};

/**
 * InstaPay bookings awaiting manual confirmation against the bank statement.
 * Tenant-scoped to the actor's tenant. Oldest first (first-in, first-confirmed).
 */
export async function getPendingInstapayPayments(tenantId: string): Promise<PendingPaymentItem[]> {
  const rows = await prisma.onlineBooking.findMany({
    where: { tenantId, status: 'payment_pending', paymentMethod: 'instapay' },
    orderBy: { createdAt: 'asc' },
    select: {
      bookingRef: true,
      fullName: true,
      countryCode: true,
      phoneNumber: true,
      amountEgp: true,
      currency: true,
      instapayReference: true,
      instapaySenderName: true,
      governorate: true,
      createdAt: true,
    },
    take: 200,
  });

  return rows.map((row) => ({
    bookingRef: row.bookingRef,
    fullName: row.fullName,
    phone: `${row.countryCode}${row.phoneNumber}`,
    amountEgp: Number(row.amountEgp),
    currency: row.currency,
    instapayReference: row.instapayReference,
    instapaySenderName: row.instapaySenderName,
    governorate: row.governorate,
    createdAtIso: row.createdAt.toISOString(),
  }));
}

export type RefundListItem = {
  id: string;
  bookingRef: string;
  amountPaidEgp: number;
  feeEgp: number;
  refundEgp: number;
  reasonCode: string;
  method: string | null;
  status: string;
  createdAtIso: string;
  completedAtIso: string | null;
};

export async function getRecentRefunds(tenantId: string): Promise<RefundListItem[]> {
  const rows = await prisma.refund.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      bookingRef: true,
      amountPaidEgp: true,
      feeEgp: true,
      refundEgp: true,
      reasonCode: true,
      method: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    bookingRef: row.bookingRef,
    amountPaidEgp: Number(row.amountPaidEgp),
    feeEgp: Number(row.feeEgp),
    refundEgp: Number(row.refundEgp),
    reasonCode: row.reasonCode,
    method: row.method,
    status: row.status,
    createdAtIso: row.createdAt.toISOString(),
    completedAtIso: row.completedAt ? row.completedAt.toISOString() : null,
  }));
}
