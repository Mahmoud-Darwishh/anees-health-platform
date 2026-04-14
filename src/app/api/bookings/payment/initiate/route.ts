import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/bookings/payment/initiate
 *
 * Creates a Kashier Payment Session using the v3 API.
 * Returns the session URL for iframe embedding on the client.
 *
 * @see https://developers.kashier.io/payment/payment-sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, amount, currency, locale, customerName, customerPhone } = body as {
      bookingId: string;
      amount: number;
      currency: string;
      locale: string;
      customerName?: string;
      customerPhone?: string;
    };

    // ── Validate request ──────────────────────────────────────────────
    if (!bookingId || !amount || !currency) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: bookingId, amount, currency' },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than zero' },
        { status: 400 },
      );
    }

    // ── Read Kashier credentials from env ─────────────────────────────
    const secretKey = process.env.KASHIER_SECRET_KEY;
    const apiKey = process.env.KASHIER_API_KEY;
    const merchantId = process.env.KASHIER_MERCHANT_ID;
    const mode = process.env.KASHIER_MODE || 'live';

    if (!secretKey || !apiKey || !merchantId) {
      console.error('[Payment] Missing Kashier environment variables');
      return NextResponse.json(
        { success: false, message: 'Payment gateway not configured' },
        { status: 503 },
      );
    }

    // ── Build redirect & webhook URLs ─────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const displayLocale = locale === 'ar' ? 'ar' : 'en';
    const merchantRedirect = `${siteUrl}/${displayLocale}/payment/redirect`;
    const serverWebhook =
      process.env.KASHIER_WEBHOOK || `${siteUrl}/api/bookings/payment/webhook`;

    // ── Session expiry: 30 minutes from now ───────────────────────────
    const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // ── Kashier API URL by mode ───────────────────────────────────────
    const kashierBaseUrl =
      mode === 'live'
        ? 'https://api.kashier.io'
        : 'https://test-api.kashier.io';

    // ── Allowed payment methods from env or fallback ──────────────────
    const allowedMethods = process.env.KASHIER_ALLOWED_METHODS || 'card,wallet';

    // ── Build session payload per Kashier v3 docs ─────────────────────
    // Note: `mode` must NOT be in the body — it is determined by the API
    // endpoint (test-api vs api) and the api-key used.
    const sessionPayload: Record<string, unknown> = {
      expireAt,
      maxFailureAttempts: 3,
      paymentType: 'credit',
      amount: String(amount),
      currency,
      order: bookingId,
      merchantId,
      merchantRedirect,
      serverWebhook,
      display: displayLocale,
      type: 'external',
      allowedMethods,
      failureRedirect: 'true',
      brandColor: process.env.KASHIER_BRAND_COLOR || '#aa8642',
      metaData: {
        bookingId,
        platform: 'anees-health',
      },
      customer: {
        reference: bookingId,
        ...(customerName && { name: customerName }),
        ...(customerPhone && { phone: customerPhone }),
      },
    };

    console.log('[Payment] Creating Kashier session for', bookingId, '— amount:', amount, currency);

    // ── Call Kashier v3 Payment Sessions API ──────────────────────────
    const kashierResponse = await fetch(`${kashierBaseUrl}/v3/payment/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: secretKey,
        'api-key': apiKey,
      },
      body: JSON.stringify(sessionPayload),
    });

    const kashierData = await kashierResponse.json();

    if (!kashierResponse.ok) {
      console.error('[Payment] Kashier session creation failed:', kashierData);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create payment session',
          error: kashierData?.message || kashierData?.messages?.en || 'Unknown error',
        },
        { status: 502 },
      );
    }

    // ── Extract session ID and build session URL ──────────────────────
    const sessionId = kashierData._id;
    const sessionUrl =
      kashierData.sessionUrl ||
      `https://payments.kashier.io/session/${sessionId}?mode=${mode}`;

    if (!sessionId) {
      console.error('[Payment] No session ID in Kashier response:', kashierData);
      return NextResponse.json(
        { success: false, message: 'Invalid payment session response' },
        { status: 502 },
      );
    }

    console.log('[Payment] Session created:', sessionId, '— URL:', sessionUrl);

    return NextResponse.json(
      {
        success: true,
        sessionId,
        sessionUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Payment] Initiate error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
