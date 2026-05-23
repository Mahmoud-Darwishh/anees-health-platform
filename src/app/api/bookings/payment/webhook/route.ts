import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';

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
        if (data.status === 'SUCCESS') {
          await prisma.onlineBooking.updateMany({
            where: { bookingRef: data.merchantOrderId },
            data: {
              status: 'payment_completed',
              kashierOrderId: data.kashierOrderId,
              kashierTransactionId: data.transactionId,
              paymentCompletedAt: new Date(),
            },
          });
        } else {
          await prisma.onlineBooking.updateMany({
            where: { bookingRef: data.merchantOrderId },
            data: { status: 'payment_failed' },
          });
        }
        break;
      }

      case 'refund': {
        await prisma.onlineBooking.updateMany({
          where: { bookingRef: data.merchantOrderId },
          data: { status: 'refunded' },
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
