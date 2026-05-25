import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import {
  isWapilotConfigured,
  normalizeWhatsAppChatId,
  sendWapilotTextMessage,
  maskWhatsAppChatId,
} from '@/lib/auth/wapilot';
import { buildPaymentConfirmationMessage } from '@/lib/utils/booking-whatsapp';

export async function POST(request: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { event: string; data: KashierWebhookData };
  try {
    body = (await request.json()) as { event: string; data: KashierWebhookData };
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data } = body;
  if (!event || !data) {
    return NextResponse.json({ received: false, error: 'Missing event/data' }, { status: 400 });
  }

  // ── Verify signature (BLOCKING — fail closed) ──────────────────────────────
  const apiKey = process.env.KASHIER_API_KEY;
  if (!apiKey) {
    console.error('[Webhook] KASHIER_API_KEY not set — refusing all webhooks');
    return NextResponse.json({ received: false, error: 'Webhook not configured' }, { status: 503 });
  }

  const kashierSignature = request.headers.get('x-kashier-signature');
  if (!kashierSignature) {
    console.error('[Webhook] Missing x-kashier-signature header for order:', data.merchantOrderId);
    return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 401 });
  }

  if (!Array.isArray(data.signatureKeys) || data.signatureKeys.length === 0) {
    console.error('[Webhook] Missing signatureKeys array in payload for order:', data.merchantOrderId);
    return NextResponse.json({ received: false, error: 'Missing signatureKeys' }, { status: 401 });
  }

  if (!verifyWebhookSignature(data, apiKey, kashierSignature)) {
    console.error('[Webhook] Invalid signature for order:', data.merchantOrderId);
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 401 });
  }

  // ── Process event ──────────────────────────────────────────────────────────
  // Wrapped in try/catch so DB failures return 500 — Kashier will then retry.
  try {
    switch (event) {
      case 'pay': {
        const booking = await prisma.onlineBooking.findUnique({
          where: { bookingRef: data.merchantOrderId },
          select: {
            bookingRef: true,
            fullName: true,
            countryCode: true,
            phoneNumber: true,
            amountEgp: true,
            discountEgp: true,
            promocodeCode: true,
            currency: true,
            locale: true,
            confirmationSentAt: true,
          },
        });

        if (!booking) {
          return NextResponse.json({ received: false, error: 'Booking not found' }, { status: 404 });
        }

        if (data.status === 'SUCCESS') {
          const normalizedPhone = `${booking.countryCode}${booking.phoneNumber}`;
          const invoiceCode = `INV_${booking.bookingRef}`;
          const paymentCode = `PAY_${booking.bookingRef}`;

          await prisma.$transaction(async (tx) => {
            const patient = await tx.patient.findFirst({
              where: { phone: normalizedPhone },
              orderBy: { createdAt: 'desc' },
            });

            if (!patient) {
              throw new Error(`Patient not found for booking ${booking.bookingRef}`);
            }

            const cardPaymentMethod = await tx.paymentMethod.findFirst({
              where: { code: 'PM-04', isActive: true },
              select: { id: true },
            });
            const fallbackPaymentMethod = !cardPaymentMethod
              ? await tx.paymentMethod.findFirst({
                  where: { isActive: true },
                  select: { id: true },
                })
              : null;
            const paymentMethodId = cardPaymentMethod?.id ?? fallbackPaymentMethod?.id;

            if (!paymentMethodId) {
              throw new Error('No active payment method configured');
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
                notes: `Paid via Kashier for booking ${booking.bookingRef}`,
              },
              update: {
                patientId: patient.id,
                grossAmountEgp: booking.amountEgp,
                netAmountEgp: booking.amountEgp,
                status: 'paid',
                notes: `Paid via Kashier for booking ${booking.bookingRef}`,
              },
            });

            await tx.payment.upsert({
              where: { code: paymentCode },
              create: {
                code: paymentCode,
                invoiceId: invoice.id,
                patientId: patient.id,
                amountEgp: booking.amountEgp,
                paymentMethodId,
                referenceNumber: data.transactionId || data.kashierOrderId || booking.bookingRef,
                notes: `Kashier order ${data.kashierOrderId}; transaction ${data.transactionId}`,
              },
              update: {
                invoiceId: invoice.id,
                patientId: patient.id,
                amountEgp: booking.amountEgp,
                paymentMethodId,
                referenceNumber: data.transactionId || data.kashierOrderId || booking.bookingRef,
                notes: `Kashier order ${data.kashierOrderId}; transaction ${data.transactionId}`,
              },
            });

            await tx.onlineBooking.update({
              where: { bookingRef: booking.bookingRef },
              data: {
                status: 'payment_completed',
                kashierOrderId: data.kashierOrderId,
                kashierTransactionId: data.transactionId,
                paymentCompletedAt: new Date(),
              },
            });

            await tx.patient.update({
              where: { id: patient.id },
              data: { status: 'active' },
            });
          });

          // ── Non-blocking WhatsApp confirmation ─────────────────────────────
          // We never block the webhook on Wapilot failure — Kashier retries
          // would create duplicate Invoices/Payments. Confirmation is
          // best-effort and we record `confirmationSentAt` to avoid resends.
          if (!booking.confirmationSentAt && isWapilotConfigured()) {
            try {
              const chatId = normalizeWhatsAppChatId(
                `${booking.countryCode}${booking.phoneNumber}`,
              );
              if (chatId) {
                const localeForMsg: 'en' | 'ar' = booking.locale === 'ar' ? 'ar' : 'en';
                const text = buildPaymentConfirmationMessage(
                  {
                    fullName: booking.fullName,
                    bookingRef: booking.bookingRef,
                    amountEgp: Number(booking.amountEgp),
                    currency: booking.currency,
                    discountEgp: Number(booking.discountEgp ?? 0),
                    promocode: booking.promocodeCode,
                  },
                  localeForMsg,
                );
                const result = await sendWapilotTextMessage({ chatId, text });
                if (result.ok) {
                  await prisma.onlineBooking.update({
                    where: { bookingRef: booking.bookingRef },
                    data: { confirmationSentAt: new Date() },
                  });
                  console.log(
                    '[Webhook] Confirmation sent to %s for %s',
                    maskWhatsAppChatId(chatId),
                    booking.bookingRef,
                  );
                } else {
                  console.error(
                    '[Webhook] Wapilot send failed for %s: status=%d',
                    booking.bookingRef,
                    result.status,
                  );
                }
              }
            } catch (err) {
              // Never let messaging crash the webhook
              console.error('[Webhook] Confirmation send threw for', booking.bookingRef, err);
            }
          }
        } else {
          await prisma.$transaction(async (tx) => {
            await tx.onlineBooking.update({
              where: { bookingRef: data.merchantOrderId },
              data: { status: 'payment_failed' },
            });

            await tx.invoice.updateMany({
              where: { code: `INV_${data.merchantOrderId}` },
              data: { status: 'cancelled' },
            });
          });
        }
        break;
      }

      case 'refund': {
        await prisma.$transaction(async (tx) => {
          await tx.onlineBooking.update({
            where: { bookingRef: data.merchantOrderId },
            data: { status: 'refunded' },
          });

          await tx.invoice.updateMany({
            where: { code: `INV_${data.merchantOrderId}` },
            data: { status: 'cancelled' },
          });
        });
        console.log('[Webhook] Refund recorded for order:', data.merchantOrderId);
        break;
      }

      default: {
        console.log('[Webhook] Unhandled event type:', event);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // DB or other infra failure — return 500 so Kashier retries the webhook
    console.error('[Webhook] Processing error for order:', data.merchantOrderId, error);
    return NextResponse.json({ received: false, error: 'Processing failed' }, { status: 500 });
  }
}

/**
 * Verify Kashier HMAC-SHA256 signature using constant-time comparison.
 */
function verifyWebhookSignature(
  data: KashierWebhookData,
  apiKey: string,
  receivedSignature: string,
): boolean {
  try {
    const sortedKeys = [...data.signatureKeys].sort();
    const pairs = sortedKeys.map((key) => {
      const value = data[key as keyof KashierWebhookData];
      return `${key}=${encodeURIComponent(String(value ?? ''))}`;
    });
    const computed = crypto
      .createHmac('sha256', apiKey)
      .update(pairs.join('&'))
      .digest('hex');

    // Constant-time comparison to prevent timing attacks. Both buffers must
    // be the same length or timingSafeEqual throws.
    const computedBuf = Buffer.from(computed, 'hex');
    const receivedBuf = Buffer.from(receivedSignature, 'hex');
    if (computedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, receivedBuf);
  } catch {
    return false;
  }
}

interface KashierWebhookData {
  merchantOrderId: string;
  kashierOrderId: string;
  orderReference: string;
  transactionId: string;
  status: string;
  method: string;
  creationDate: string;
  amount: number;
  currency: string;
  transactionResponseCode: string;
  transactionResponseMessage?: { en: string; ar: string };
  signatureKeys: string[];
  [key: string]: unknown;
}
