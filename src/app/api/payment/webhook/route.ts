import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

  console.log('Signature validation:', {
    received: query.signature,
    calculated: signature,
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

    console.log('📥 Webhook received:', {
      orderId: body.merchantOrderId,
      transactionId: body.transactionId,
      status: body.paymentStatus,
    });

    if (!apiKey) {
      console.error('❌ Kashier API key not configured');
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    // Validate signature
    const isValid = validateSignature(body, apiKey);

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ Signature validated successfully');

    // Log payment details
    console.log('💳 Payment details:', {
      orderId: body.merchantOrderId,
      transactionId: body.transactionId,
      status: body.paymentStatus,
      amount: body.amount,
      currency: body.currency,
      cardBrand: body.cardBrand,
      maskedCard: body.maskedCard,
    });

    // TODO: Update booking status in database
    // Based on payment status, update the booking record
    if (body.paymentStatus === 'SUCCESS') {
      console.log('✅ Payment successful - Update booking status to PAID');
      // await updateBookingPaymentStatus(body.merchantOrderId, {
      //   status: 'paid',
      //   transactionId: body.transactionId,
      //   paymentMethod: body.cardBrand || 'unknown',
      //   paidAt: new Date(),
      // });
    } else {
      console.log('❌ Payment failed');
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
    console.error('❌ Webhook error:', error);
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
