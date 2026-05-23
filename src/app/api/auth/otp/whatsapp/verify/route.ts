import { NextRequest, NextResponse } from 'next/server';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';
import { normalizeWhatsAppChatId } from '@/lib/auth/wapilot';
import { verifyWhatsAppOtp } from '@/lib/auth/whatsapp-otp-store';

const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_LIMIT_PER_IP = 25;

function normalizeOtpCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim();
  return /^\d{6}$/.test(code) ? code : null;
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  const ip = getClientIp(request);
  const ipAllowed = await checkRateLimit(`wa-otp-verify:ip:${ip}`, VERIFY_LIMIT_PER_IP, VERIFY_WINDOW_MS);
  if (!ipAllowed) return tooManyRequests(cors);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400, headers: cors },
    );
  }

  const { phone, code } = body as { phone?: unknown; code?: unknown };

  if (typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json(
      { success: false, error: 'WhatsApp phone is required.' },
      { status: 400, headers: cors },
    );
  }

  const chatId = normalizeWhatsAppChatId(phone);
  if (!chatId) {
    return NextResponse.json(
      { success: false, error: 'Invalid WhatsApp number format.' },
      { status: 400, headers: cors },
    );
  }

  const normalizedCode = normalizeOtpCode(code);
  if (!normalizedCode) {
    return NextResponse.json(
      { success: false, error: 'OTP must be exactly 6 digits.' },
      { status: 400, headers: cors },
    );
  }

  const result = verifyWhatsAppOtp(chatId, normalizedCode);

  if (result.ok) {
    return NextResponse.json({ success: true }, { status: 200, headers: cors });
  }

  if (result.reason === 'too_many_attempts') {
    return NextResponse.json(
      { success: false, error: 'Too many incorrect attempts. Request a new OTP.' },
      { status: 429, headers: cors },
    );
  }

  if (result.reason === 'expired') {
    return NextResponse.json(
      { success: false, error: 'OTP has expired. Request a new OTP.' },
      { status: 400, headers: cors },
    );
  }

  return NextResponse.json(
    { success: false, error: 'Invalid OTP. Please try again.' },
    { status: 400, headers: cors },
  );
}

export async function OPTIONS(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  });
}
