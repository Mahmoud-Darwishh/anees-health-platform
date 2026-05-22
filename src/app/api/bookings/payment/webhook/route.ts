import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body as { event: string; data: KashierWebhookData };

    if (!event || !data) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const apiKey = process.env.KASHIER_API_KEY;
    const kashierSignature = request.headers.get('x-kashier-signature');

    if (apiKey && kashierSignature && data.signatureKeys) {
      const isValid = verifyWebhookSignature(data, apiKey, kashierSignature);
      if (!isValid) {
        console.error('[Webhook] Invalid signature for order:', data.merchantOrderId);
      }
    }

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
        console.log('[Webhook] Refund event:', data.merchantOrderId);
        break;
      }

      default: {
        console.log('[Webhook] Unhandled event type:', event);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

function verifyWebhookSignature(data: KashierWebhookData, apiKey: string, receivedSignature: string): boolean {
  try {
    const sortedKeys = [...data.signatureKeys].sort();
    const pairs = sortedKeys.map((key) => {
      const value = data[key as keyof KashierWebhookData];
      return `${key}=${encodeURIComponent(String(value ?? ''))}`;
    });
    const computed = crypto.createHmac('sha256', apiKey).update(pairs.join('&')).digest('hex');
    return computed === receivedSignature;
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
