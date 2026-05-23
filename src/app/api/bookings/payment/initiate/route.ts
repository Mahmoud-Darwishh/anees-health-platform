import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';

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
    // 20 payment session creations per minute per IP
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`payment-initiate:${ip}`, 20, 60_000);
    if (!allowed) return tooManyRequests();

    const body = await request.json();
    const { bookingId, locale, customerName, customerPhone } = body as {
      bookingId: string;
      locale: string;
      customerName?: string;
      customerPhone?: string;
    };

    // ── Validate request ──────────────────────────────────────────────
    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: bookingId' },
        { status: 400 },
      );
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef: bookingId },
      select: {
        bookingRef: true,
        fullName: true,
        countryCode: true,
        phoneNumber: true,
        amountEgp: true,
        currency: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 },
      );
    }

    if (booking.status === 'payment_completed') {
      return NextResponse.json(
        { success: false, message: 'Booking is already paid' },
        { status: 409 },
      );
    }

    const amount = Number(booking.amountEgp);
    const currency = booking.currency || 'EGP';

    // ── Read Kashier credentials from env ─────────────────────────────
    const mode = (process.env.KASHIER_MODE || 'live').toLowerCase();
    const secretKey = process.env.KASHIER_SECRET_KEY;
    const apiKey = process.env.KASHIER_API_KEY;
    const merchantId = process.env.KASHIER_MERCHANT_ID;

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

    if (!process.env.KASHIER_WEBHOOK) {
      console.warn(
        '[Payment] KASHIER_WEBHOOK env var is not set — falling back to',
        serverWebhook,
        '. Set KASHIER_WEBHOOK in Vercel to your production webhook URL.',
      );
    }

    // Kashier (both live and test) rejects http/localhost URLs.
    // Fail fast with a clear message so this isn't misdiagnosed as a credentials problem.
    const isPublicHttps = /^https:\/\/(?!localhost|127\.|0\.0\.0\.0)/i.test(siteUrl);
    if (!isPublicHttps) {
      console.error(
        `[Payment] ${mode} mode requires a public HTTPS NEXT_PUBLIC_SITE_URL. Got:`,
        siteUrl,
      );
      return NextResponse.json(
        {
          success: false,
          message:
            `Payment gateway misconfigured: ${mode} mode needs a public HTTPS site URL. ` +
            'Run a tunnel (cloudflared/ngrok) and set NEXT_PUBLIC_SITE_URL to the tunnel URL.',
        },
        { status: 503 },
      );
    }

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
        ...(customerName ? { name: customerName } : { name: booking.fullName }),
        ...(customerPhone ? { phone: customerPhone } : { phone: `+${booking.countryCode}${booking.phoneNumber}` }),
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

    const normalizedPhone = `${booking.countryCode}${booking.phoneNumber}`;
    const invoiceCode = `INV_${booking.bookingRef}`;

    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { phone: normalizedPhone },
        orderBy: { createdAt: 'desc' },
      });

      if (!patient) {
        throw new Error('Linked patient registration not found for booking');
      }

      await tx.invoice.upsert({
        where: { code: invoiceCode },
        create: {
          code: invoiceCode,
          patientId: patient.id,
          linkedType: 'visit',
          grossAmountEgp: amount,
          netAmountEgp: amount,
          status: 'issued',
          notes: `Auto-created from online booking ${booking.bookingRef}`,
        },
        update: {
          patientId: patient.id,
          grossAmountEgp: amount,
          netAmountEgp: amount,
          status: 'issued',
          notes: `Auto-created from online booking ${booking.bookingRef}`,
        },
      });

      await tx.onlineBooking.update({
        where: { bookingRef: booking.bookingRef },
        data: {
          kashierSessionId: sessionId,
          status: 'payment_pending',
        },
      });
    });

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
