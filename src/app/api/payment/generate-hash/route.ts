import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate Kashier Order Hash
 * POST /api/payment/generate-hash
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, orderId, customerId } = body;

    console.log('Generate hash request:', { amount, currency, orderId, customerId });

    // Validate required fields
    if (!amount || !currency || !orderId) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency, orderId' },
        { status: 400 }
      );
    }

    // Get credentials from environment
    const merchantId = process.env.KASHIER_MERCHANT_ID;
    // Kashier docs require the secret key for hashing; fall back to API key only if not provided.
    const secretKey = process.env.KASHIER_SECRET_KEY || process.env.KASHIER_API_KEY;
    const mode = process.env.KASHIER_MODE === 'live' ? 'live' : 'test'; // Default to test

    console.log('Environment check:', {
      merchantId: merchantId ? 'SET' : 'MISSING',
      secretKey: secretKey ? 'SET' : 'MISSING',
      mode,
      modeEnv: process.env.KASHIER_MODE || 'not set (defaulting to test)'
    });

    if (!merchantId || !secretKey) {
      console.error('Kashier credentials not configured');
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please add KASHIER_MERCHANT_ID and KASHIER_SECRET_KEY (or KASHIER_API_KEY) to environment variables.' },
        { status: 500 }
      );
    }

    // Trim secret key to remove any whitespace
    const trimmedSecretKey = secretKey.trim();

    // Generate hash path as per Kashier documentation
    // Format: mid.orderId.amount.currency[.customerReference]
    const path = `${merchantId}.${orderId}.${amount}.${currency}${
      customerId ? '.' + customerId : ''
    }`;

    console.log('Hash generation details:', {
      path,
      secretKeyLength: trimmedSecretKey.length,
      merchantId,
      orderId,
      amount,
      currency,
      customerId
    });

    // Generate HMAC SHA256 hash using Secret Key (as per Kashier documentation)
    const hash = crypto
      .createHmac('sha256', trimmedSecretKey)
      .update(path)
      .digest('hex');

    console.log('✅ Hash generated:', hash);

    // Return payment configuration
    return NextResponse.json({
      hash,
      merchantId,
      mode,
      orderId,
      amount,
      currency,
      customerId,
    });
  } catch (error) {
    console.error('Error generating payment hash:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate payment hash';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
