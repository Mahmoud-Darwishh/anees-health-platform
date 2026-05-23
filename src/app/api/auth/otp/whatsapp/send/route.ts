import { NextRequest, NextResponse } from 'next/server';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';
import { clearWhatsAppOtp, createWhatsAppOtp, getWhatsAppOtpTtlMs } from '@/lib/auth/whatsapp-otp-store';
import {
  isWapilotConfigured,
  maskWhatsAppChatId,
  normalizeWhatsAppChatId,
  sendWapilotTextMessage,
} from '@/lib/auth/wapilot';

const SEND_WINDOW_MS = 10 * 60 * 1000;
const SEND_LIMIT_PER_IP = 8;
const SEND_LIMIT_PER_RECIPIENT = 3;
const MAX_PURPOSE_LENGTH = 40;

function sanitizePurpose(value: unknown): string {
  if (typeof value !== 'string') return 'site-test';

  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9 _-]/g, '').slice(0, MAX_PURPOSE_LENGTH);
  return cleaned || 'site-test';
}

function formatPurposeLabel(purpose: string): string {
  return purpose
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'account verification';
}

function buildOtpMessage(code: string, purpose: string): string {
  const ttlMinutes = Math.floor(getWhatsAppOtpTtlMs() / 60_000);
  const purposeLabel = formatPurposeLabel(purpose);

  return [
    'Anees Health | Official OTP',
    '',
    'Hello from Anees Health team,',
    `Your one-time verification code is: ${code}`,
    `This code is valid for ${ttlMinutes} minutes.`,
    `Requested for: ${purposeLabel}.`,
    '',
    'Security note: Never share this OTP with anyone.',
    'If you did not request this, please ignore this message.',
    '',
    '---',
    'أنـيس هيلث | رمز تحقق رسمي',
    `رمز التحقق الخاص بك: ${code}`,
    `صالح لمدة ${ttlMinutes} دقائق.`,
    'للامان: لا تشارك هذا الرمز مع اي شخص.',
  ].join('\n');
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  if (!isWapilotConfigured()) {
    return NextResponse.json(
      { success: false, error: 'WhatsApp OTP service is not configured on this server.' },
      { status: 503, headers: cors },
    );
  }

  const ip = getClientIp(request);
  const ipAllowed = await checkRateLimit(`wa-otp-send:ip:${ip}`, SEND_LIMIT_PER_IP, SEND_WINDOW_MS);
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

  const { phone, purpose } = body as { phone?: unknown; purpose?: unknown };

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

  const recipientAllowed = await checkRateLimit(
    `wa-otp-send:to:${chatId}`,
    SEND_LIMIT_PER_RECIPIENT,
    SEND_WINDOW_MS,
  );
  if (!recipientAllowed) {
    return NextResponse.json(
      { success: false, error: 'Too many OTP requests for this number. Please wait a few minutes.' },
      { status: 429, headers: cors },
    );
  }

  const safePurpose = sanitizePurpose(purpose);
  const { code, expiresAtMs } = createWhatsAppOtp(chatId, safePurpose);

  const result = await sendWapilotTextMessage({
    chatId,
    text: buildOtpMessage(code, safePurpose),
  });

  if (!result.ok) {
    clearWhatsAppOtp(chatId);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send OTP through WhatsApp provider.',
        providerStatus: result.status,
      },
      { status: 502, headers: cors },
    );
  }

  return NextResponse.json(
    {
      success: true,
      recipient: maskWhatsAppChatId(chatId),
      expiresInSeconds: Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000)),
    },
    { status: 200, headers: cors },
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
