import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/bookings/payment-webhook
 * 
 * Webhook endpoint for Kashier payment notifications
 * Kashier will POST payment status to this endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate Kashier webhook payload
    // In production, verify the signature using Kashier's API key
    const {
      orderId, // bookingId
      status, // 'success' | 'failed' | 'pending'
      transactionId,
      amount,
      currency,
    } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Handle payment status
    switch (status) {
      case 'success':
        await handlePaymentSuccess({
          bookingId: orderId,
          transactionId,
          amount,
          currency,
        });
        break;

      case 'failed':
        await handlePaymentFailed({
          bookingId: orderId,
          transactionId,
        });
        break;

      case 'pending':
        // Update booking status to 'payment_pending'
        await updateBookingStatus(orderId, 'payment_pending');
        break;

      default:
        console.warn('[Payment Webhook] Unknown status:', status);
    }

    // Return 200 OK to Kashier to confirm receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Payment Webhook Error]', error);

    return NextResponse.json(
      { success: false, message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess({
  bookingId,
  transactionId,
  amount,
  currency,
}: {
  bookingId: string;
  transactionId: string;
  amount: number;
  currency: string;
}) {
  console.log('[Payment Success]', {
    bookingId,
    transactionId,
    amount,
    currency,
    timestamp: new Date().toISOString(),
  });

  // TODO: Update booking status in database
  // - Set status to 'confirmed'
  // - Store transaction ID
  // - Send confirmation email/SMS to customer
  // - Trigger any post-booking workflows (e.g., assign care provider)

  await updateBookingStatus(bookingId, 'confirmed');
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed({
  bookingId,
  transactionId,
}: {
  bookingId: string;
  transactionId: string;
}) {
  console.log('[Payment Failed]', {
    bookingId,
    transactionId,
    timestamp: new Date().toISOString(),
  });

  // TODO: Update booking status in database
  // - Set status to 'payment_failed'
  // - Store transaction ID
  // - Send notification to customer to retry payment

  await updateBookingStatus(bookingId, 'payment_failed');
}

/**
 * Update booking status (placeholder)
 * In production, this would update the database
 */
async function updateBookingStatus(bookingId: string, status: string) {
  // TODO: Implement database update
  console.log(`[Update Booking] ${bookingId} -> ${status}`);

  // Example database call:
  // await db.bookings.update({
  //   where: { id: bookingId },
  //   data: { status, updatedAt: new Date() }
  // });
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
