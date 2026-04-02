import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/utils/app-logger';

/**
 * Validate Kashier Signature
 * As per Kashier documentation: https://developers.kashier.io/payment/payment-ui
 */
function validateSignature(
  query: Record<string, string>,
  apiKey: string
): boolean {
  let queryString = '';

  // Build query string excluding 'signature' and 'mode'
  for (const key in query) {
    if (key === 'signature' || key === 'mode') continue;
    queryString += '&' + key + '=' + query[key];
  }

  // Remove leading '&'
  const finalUrl = queryString.substring(1);
  
  // Generate signature using HMAC SHA256
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(finalUrl)
    .digest('hex');

  logger.debug('Signature validation', {
    match: signature === query.signature,
  });

  return signature === query.signature;
}

/**
 * Handle Kashier Webhook
 * POST /api/payment/webhook
 * 
 * Receives server-to-server payment notifications from Kashier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = process.env.KASHIER_API_KEY;

    logger.info('Webhook received', {
      orderId: body.merchantOrderId,
      status: body.paymentStatus,
    });

    if (!apiKey) {
      logger.error('Kashier API key not configured');
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    // Validate signature
    const isValid = validateSignature(body, apiKey);

    if (!isValid) {
      logger.error('Invalid webhook signature', { orderId: body.merchantOrderId });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    logger.info('Payment webhook validated', {
      orderId: body.merchantOrderId,
      transactionId: body.transactionId,
      status: body.paymentStatus,
    });

    // TODO: Update booking status in database
    // Based on payment status, update the booking record
    if (body.paymentStatus === 'SUCCESS') {
      logger.info('Payment successful — pending DB update', { orderId: body.merchantOrderId });
      // await updateBookingPaymentStatus(body.merchantOrderId, {
      //   status: 'paid',
      //   transactionId: body.transactionId,
      //   paymentMethod: body.cardBrand || 'unknown',
      //   paidAt: new Date(),
      // });
    } else {
      logger.warn('Payment failed', { orderId: body.merchantOrderId, status: body.paymentStatus });
      // await updateBookingPaymentStatus(body.merchantOrderId, {
      //   status: 'failed',
      //   transactionId: body.transactionId,
      //   failureReason: body.transactionResponseCode,
      // });
    }

    // Acknowledge receipt
    return NextResponse.json({
      received: true,
      orderId: body.merchantOrderId,
      status: body.paymentStatus,
    });
  } catch (error) {
    logger.error('Webhook processing error', error instanceof Error ? error.message : String(error));
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (for testing)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Kashier webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
