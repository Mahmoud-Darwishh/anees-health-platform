'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getStaffUser } from '@/lib/auth/rbac';
import { sendPortalClaimInviteForBooking } from '@/lib/billing/portal-invite';
import { createVisitFromBooking } from '@/lib/billing/create-visit-from-booking';
import { calculateCancellationFee, type DisruptionCode } from '@/lib/billing/cancellation-policy';
import { PAYMENT_CONFIRM_ROLES, type BillingActionState } from './types';

const REFUND_REASONS: DisruptionCode[] = [
  'patient_late_cancel',
  'med_ops_reassignment',
  'unsafe_environment',
  'patient_no_show',
  'patient_refused_care',
  'other',
];

async function requirePaymentStaff() {
  const staff = await getStaffUser([...PAYMENT_CONFIRM_ROLES]);
  if (!staff?.staffId) {
    throw new Error('UNAUTHORIZED');
  }
  return staff;
}

function errorState(error: unknown): BillingActionState {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return { status: 'error', message: 'You are not authorised to confirm payments.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

/**
 * Confirm an InstaPay transfer against the bank statement. Mirrors the Kashier
 * webhook's success path (paid Invoice + Payment + booking completed + patient
 * active), records WHO confirmed + WHEN, then fires the portal-claim invite.
 */
export async function confirmInstapayPaymentAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  try {
    const staff = await requirePaymentStaff();
    const bookingRef = String(formData.get('bookingRef') ?? '').trim();
    if (!bookingRef) {
      return { status: 'error', message: 'Missing booking reference.' };
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef },
      select: {
        bookingRef: true,
        countryCode: true,
        phoneNumber: true,
        amountEgp: true,
        status: true,
        instapayReference: true,
        tenantId: true,
      },
    });

    if (!booking) {
      return { status: 'error', message: 'Booking not found.' };
    }
    if (booking.status === 'payment_completed') {
      return { status: 'error', message: 'This booking is already confirmed as paid.' };
    }
    if (booking.tenantId !== (staff.tenantId ?? 'platform')) {
      return { status: 'error', message: 'This booking belongs to a different tenant.' };
    }

    const normalizedPhone = `${booking.countryCode}${booking.phoneNumber}`;
    const invoiceCode = `INV_${booking.bookingRef}`;
    const paymentCode = `PAY_${booking.bookingRef}`;
    const changedBy = `staff_${staff.staffId}`;

    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { phone: normalizedPhone },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!patient) {
        throw new Error('Linked patient not found for this booking.');
      }

      const instapayMethod =
        (await tx.paymentMethod.findFirst({ where: { code: 'PM-02', isActive: true }, select: { id: true } })) ??
        (await tx.paymentMethod.findFirst({ where: { isActive: true }, select: { id: true } }));
      if (!instapayMethod) {
        throw new Error('No active payment method configured.');
      }

      const invoice = await tx.invoice.upsert({
        where: { code: invoiceCode },
        create: {
          code: invoiceCode,
          patientId: patient.id,
          linkedType: 'visit',
          grossAmountEgp: booking.amountEgp,
          netAmountEgp: booking.amountEgp,
          status: 'paid',
          notes: `InstaPay confirmed for booking ${booking.bookingRef}`,
        },
        update: {
          patientId: patient.id,
          grossAmountEgp: booking.amountEgp,
          netAmountEgp: booking.amountEgp,
          status: 'paid',
          notes: `InstaPay confirmed for booking ${booking.bookingRef}`,
        },
      });

      await tx.payment.upsert({
        where: { code: paymentCode },
        create: {
          code: paymentCode,
          invoiceId: invoice.id,
          patientId: patient.id,
          amountEgp: booking.amountEgp,
          paymentMethodId: instapayMethod.id,
          referenceNumber: booking.instapayReference ?? booking.bookingRef,
          receivedBy: changedBy,
          notes: `InstaPay transfer confirmed by ${changedBy}`,
        },
        update: {
          invoiceId: invoice.id,
          patientId: patient.id,
          amountEgp: booking.amountEgp,
          paymentMethodId: instapayMethod.id,
          referenceNumber: booking.instapayReference ?? booking.bookingRef,
          receivedBy: changedBy,
        },
      });

      await tx.onlineBooking.update({
        where: { bookingRef: booking.bookingRef },
        data: {
          status: 'payment_completed',
          paymentMethod: 'instapay',
          paymentConfirmedAt: new Date(),
          paymentConfirmedBy: staff.staffId,
        },
      });

      await tx.patient.update({ where: { id: patient.id }, data: { status: 'active' } });

      await tx.auditLog.create({
        data: {
          tableName: 'online_bookings',
          recordId: booking.bookingRef,
          action: 'update',
          changedFields: {
            source: 'admin.billing.confirm_instapay',
            fields: ['status', 'paymentConfirmedAt', 'paymentConfirmedBy'],
          },
          changedBy,
        },
      });
    });

    // Fire the portal-claim invite + convert to a draft Visit (both best-effort,
    // idempotent, never throw — the payment is already committed).
    await sendPortalClaimInviteForBooking(booking.bookingRef);
    await createVisitFromBooking(booking.bookingRef);

    revalidatePath('/admin/billing');
    return { status: 'success', message: `Payment confirmed for ${booking.bookingRef}. Portal invite sent.` };
  } catch (error) {
    return errorState(error);
  }
}

/** Mark an InstaPay booking as not received (transfer never arrived / mismatch). */
export async function rejectInstapayPaymentAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  try {
    const staff = await requirePaymentStaff();
    const bookingRef = String(formData.get('bookingRef') ?? '').trim();
    if (!bookingRef) {
      return { status: 'error', message: 'Missing booking reference.' };
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef },
      select: { bookingRef: true, status: true, tenantId: true },
    });
    if (!booking) {
      return { status: 'error', message: 'Booking not found.' };
    }
    if (booking.tenantId !== (staff.tenantId ?? 'platform')) {
      return { status: 'error', message: 'This booking belongs to a different tenant.' };
    }
    if (booking.status === 'payment_completed') {
      return { status: 'error', message: 'This booking is already confirmed as paid; reject is not possible.' };
    }

    await prisma.onlineBooking.update({ where: { bookingRef }, data: { status: 'payment_failed' } });
    await prisma.auditLog.create({
      data: {
        tableName: 'online_bookings',
        recordId: bookingRef,
        action: 'update',
        changedFields: { source: 'admin.billing.reject_instapay', fields: ['status'] },
        changedBy: `staff_${staff.staffId}`,
      },
    });

    revalidatePath('/admin/billing');
    return { status: 'success', message: `Booking ${bookingRef} marked as not received.` };
  } catch (error) {
    return errorState(error);
  }
}

/**
 * Record a refund for a PAID booking. The amount is policy-driven (the
 * cancellation policy decides the fee from the reason); the actual money is
 * returned manually (Kashier refund or InstaPay reverse transfer) and tracked
 * to completion via `completeRefundAction`.
 */
export async function recordRefundAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  try {
    const staff = await requirePaymentStaff();
    const bookingRef = String(formData.get('bookingRef') ?? '').trim();
    const reasonCode = String(formData.get('reasonCode') ?? '').trim() as DisruptionCode;
    const reasonNote = String(formData.get('reasonNote') ?? '').trim() || null;

    if (!bookingRef) {
      return { status: 'error', message: 'Missing booking reference.' };
    }
    if (!REFUND_REASONS.includes(reasonCode)) {
      return { status: 'error', message: 'Choose a valid refund reason.' };
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef },
      select: {
        bookingRef: true,
        amountEgp: true,
        status: true,
        paymentMethod: true,
        tenantId: true,
        countryCode: true,
        phoneNumber: true,
      },
    });
    if (!booking) {
      return { status: 'error', message: 'Booking not found.' };
    }
    if (booking.tenantId !== (staff.tenantId ?? 'platform')) {
      return { status: 'error', message: 'This booking belongs to a different tenant.' };
    }
    if (booking.status !== 'payment_completed') {
      return { status: 'error', message: 'Only a paid booking can be refunded.' };
    }

    const amountPaid = Number(booking.amountEgp);
    const { feeEgp } = calculateCancellationFee({
      servicePriceEgp: amountPaid,
      disruptionCode: reasonCode,
      minutesBeforeScheduledStart: null,
    });
    const refundEgp = Math.max(Math.round((amountPaid - feeEgp) * 100) / 100, 0);

    const patient = await prisma.patient.findFirst({
      where: { phone: `${booking.countryCode}${booking.phoneNumber}` },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          bookingRef: booking.bookingRef,
          patientId: patient?.id ?? null,
          amountPaidEgp: amountPaid,
          feeEgp,
          refundEgp,
          reasonCode,
          reasonNote,
          method: booking.paymentMethod,
          status: 'pending',
          requestedByStaffId: staff.staffId,
          tenantId: booking.tenantId,
        },
      });

      await tx.onlineBooking.update({ where: { bookingRef: booking.bookingRef }, data: { status: 'refunded' } });
      await tx.invoice.updateMany({ where: { code: `INV_${booking.bookingRef}` }, data: { status: 'cancelled' } });

      await tx.auditLog.create({
        data: {
          tableName: 'refunds',
          recordId: booking.bookingRef,
          action: 'create',
          changedFields: {
            source: 'admin.billing.record_refund',
            reasonCode,
            amountPaidEgp: amountPaid,
            feeEgp,
            refundEgp,
          },
          changedBy: `staff_${staff.staffId}`,
        },
      });
    });

    revalidatePath('/admin/billing');
    return {
      status: 'success',
      message: `Refund recorded: ${refundEgp.toLocaleString('en-US')} EGP (fee ${feeEgp.toLocaleString('en-US')} EGP). Now send the money and mark it completed.`,
    };
  } catch (error) {
    return errorState(error);
  }
}

/** Mark a recorded refund as completed once the money has actually been returned. */
export async function completeRefundAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  try {
    const staff = await requirePaymentStaff();
    const refundId = String(formData.get('refundId') ?? '').trim();
    if (!refundId) {
      return { status: 'error', message: 'Missing refund id.' };
    }

    const refund = await prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, status: true, tenantId: true } });
    if (!refund) {
      return { status: 'error', message: 'Refund not found.' };
    }
    if (refund.tenantId !== (staff.tenantId ?? 'platform')) {
      return { status: 'error', message: 'This refund belongs to a different tenant.' };
    }
    if (refund.status === 'completed') {
      return { status: 'error', message: 'This refund is already completed.' };
    }

    await prisma.refund.update({ where: { id: refundId }, data: { status: 'completed', completedAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        tableName: 'refunds',
        recordId: refundId,
        action: 'update',
        changedFields: { source: 'admin.billing.complete_refund', fields: ['status', 'completedAt'] },
        changedBy: `staff_${staff.staffId}`,
      },
    });

    revalidatePath('/admin/billing');
    return { status: 'success', message: 'Refund marked as completed.' };
  } catch (error) {
    return errorState(error);
  }
}
