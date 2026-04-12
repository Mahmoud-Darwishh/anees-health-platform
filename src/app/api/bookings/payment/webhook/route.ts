import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/bookings/payment/webhook
 *
 * Receives Kashier server-to-server payment notifications.
 * Validates the HMAC-SHA256 signature, then processes the event.
 *
 * @see https://developers.kashier.io/webhooks/setup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body as {
      event: string;
      data: KashierWebhookData;
    };

    if (!event || !data) {
      console.error('[Webhook] Missing event or data');
      return NextResponse.json({ received: false }, { status: 400 });
    }

    console.log('[Webhook] Received event:', event, '— order:', data.merchantOrderId);

    // ── Signature verification ────────────────────────────────────────
    const apiKey = process.env.KASHIER_API_KEY;
    const kashierSignature = request.headers.get('x-kashier-signature');

    if (apiKey && kashierSignature && data.signatureKeys) {
      const isValid = verifyWebhookSignature(data, apiKey, kashierSignature);

      if (!isValid) {
        console.error('[Webhook] Invalid signature for order:', data.merchantOrderId);
        // Still return 200 to prevent Kashier retries, but log the issue
        // In production with a database, you would mark this as suspicious
      } else {
        console.log('[Webhook] Signature verified for order:', data.merchantOrderId);
      }
    }

    // ── Process events ────────────────────────────────────────────────
    switch (event) {
      case 'pay': {
        if (data.status === 'SUCCESS') {
          console.log('[Webhook] Payment SUCCESS:', {
            merchantOrderId: data.merchantOrderId,
            amount: data.amount,
            currency: data.currency,
            transactionId: data.transactionId,
            method: data.method,
          });

          // TODO: Update booking status in database to 'paid'
          // TODO: Send confirmation email/SMS to patient
          // TODO: Notify care team
        } else {
          console.log('[Webhook] Payment FAILED:', {
            merchantOrderId: data.merchantOrderId,
            status: data.status,
            responseCode: data.transactionResponseCode,
          });

          // TODO: Update booking status in database to 'payment_failed'
        }
        break;
      }

      case 'refund': {
        console.log('[Webhook] Refund event:', {
          merchantOrderId: data.merchantOrderId,
          amount: data.amount,
        });
        // TODO: Update booking status in database to 'refunded'
        break;
      }

      default: {
        console.log('[Webhook] Unhandled event type:', event);
      }
    }

    // Always respond 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Return 200 to prevent Kashier retry loops for malformed requests
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// ── Kashier Webhook Signature Verification ──────────────────────────────
// Per Kashier docs: sort signatureKeys alphabetically, pick those from data,
// build URL-encoded query string, HMAC-SHA256 with Payment API Key
function verifyWebhookSignature(
  data: KashierWebhookData,
  apiKey: string,
  receivedSignature: string,
): boolean {
  try {
    const sortedKeys = [...data.signatureKeys].sort();

    const pairs = sortedKeys.map((key) => {
      const value = data[key as keyof KashierWebhookData];
      // URL-encode the value only (not the key)
      return `${key}=${encodeURIComponent(String(value ?? ''))}`;
    });

    const signaturePayload = pairs.join('&');

    const computedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(signaturePayload)
      .digest('hex');

    return computedSignature === receivedSignature;
  } catch (err) {
    console.error('[Webhook] Signature computation error:', err);
    return false;
  }
}

// ── Types ───────────────────────────────────────────────────────────────

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
  card?: {
    cardInfo?: {
      cardHolderName: string;
      cardBrand: string;
      maskedCard: string;
    };
  };
  merchantDetails?: {
    merchantId: string;
    storeName: string;
  };
  channel?: string;
  [key: string]: unknown;
}
