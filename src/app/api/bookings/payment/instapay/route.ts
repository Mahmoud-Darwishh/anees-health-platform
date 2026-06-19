import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';

/**
 * POST /api/bookings/payment/instapay
 *
 * The InstaPay rail. There is NO merchant webhook for InstaPay — the patient
 * transfers to our account in their bank app, then submits the transfer here.
 * This records the intent (+ optional reference) and parks the booking at
 * `payment_pending` for an ops/finance member to confirm against the bank
 * statement (see /admin/billing). No money moves automatically.
 */

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`payment-instapay:${ip}`, 20, 60_000);
    if (!allowed) return tooManyRequests(cors);

    const body = await request.json().catch(() => null);
    const bookingId = clip(body?.bookingId, 80);
    const reference = clip(body?.reference, 120);
    const senderName = clip(body?.senderName, 120);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: bookingId' },
        { status: 400, headers: cors },
      );
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef: bookingId },
      select: {
        bookingRef: true,
        countryCode: true,
        phoneNumber: true,
        baseAmountEgp: true,
        amountEgp: true,
        discountEgp: true,
        promocodeCode: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404, headers: cors });
    }
    if (booking.status === 'payment_completed') {
      return NextResponse.json({ success: false, message: 'Booking is already paid' }, { status: 409, headers: cors });
    }

    const normalizedPhone = `${booking.countryCode}${booking.phoneNumber}`;
    const invoiceCode = `INV_${booking.bookingRef}`;
    const baseAmount = Number(booking.baseAmountEgp ?? booking.amountEgp);
    const netAmount = Number(booking.amountEgp);
    const discountAmount = Number(booking.discountEgp ?? 0);

    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { phone: normalizedPhone },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!patient) {
        throw new Error('Linked patient registration not found for booking');
      }

      // Issue (not paid) invoice — mirrors the card initiate path.
      await tx.invoice.upsert({
        where: { code: invoiceCode },
        create: {
          code: invoiceCode,
          patientId: patient.id,
          linkedType: 'visit',
          grossAmountEgp: baseAmount,
          netAmountEgp: netAmount,
          status: 'issued',
          notes:
            `InstaPay (awaiting confirmation) for booking ${booking.bookingRef}` +
            (booking.promocodeCode ? ` (promo ${booking.promocodeCode}, discount ${discountAmount} EGP)` : ''),
        },
        update: {
          patientId: patient.id,
          grossAmountEgp: baseAmount,
          netAmountEgp: netAmount,
          status: 'issued',
        },
      });

      await tx.onlineBooking.update({
        where: { bookingRef: booking.bookingRef },
        data: {
          paymentMethod: 'instapay',
          status: 'payment_pending',
          instapayReference: reference ?? null,
          instapaySenderName: senderName ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: 'online_bookings',
          recordId: booking.bookingRef,
          action: 'update',
          changedFields: {
            source: 'api.booking.payment.instapay',
            fields: ['paymentMethod', 'status', 'instapayReference', 'instapaySenderName'],
          },
          changedBy: `system_ip:${ip}`,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201, headers: cors });
  } catch (error) {
    console.error('[Payment] InstaPay submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit InstaPay payment' },
      { status: 500, headers: cors },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  });
}
