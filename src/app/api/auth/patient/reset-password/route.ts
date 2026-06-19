import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';
import { normalizeWhatsAppChatId } from '@/lib/auth/wapilot';
import { verifyWhatsAppOtp } from '@/lib/auth/whatsapp-otp-store';
import { hashPassword } from '@/lib/auth/password';
import { passwordSchema } from '@/lib/auth/password-rules';

/**
 * Patient self-service password reset. The WhatsApp OTP IS the authorization:
 * we verify the code and set the new password in ONE atomic call, so a verified
 * code can't be replayed against a separate endpoint. Patient-only.
 */

/** Egypt-aware phone variants so the entered number matches the stored one. */
function phoneVariants(input: string): string[] {
  const digits = input.replace(/\D/g, '');
  const set = new Set<string>([input.trim(), digits, `+${digits}`]);
  if (digits.startsWith('20')) {
    const local = digits.slice(2);
    set.add(local).add(`0${local}`).add(`20${local}`).add(`+20${local}`);
  } else if (digits.startsWith('0')) {
    const local = digits.slice(1);
    set.add(local).add(`20${local}`).add(`+20${local}`);
  } else {
    set.add(`0${digits}`).add(`20${digits}`).add(`+20${digits}`);
  }
  return [...set].filter(Boolean);
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  const ip = getClientIp(request);

  const allowed = await checkRateLimit(`patient-reset:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) return tooManyRequests(cors);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400, headers: cors });
  }

  const { phone, code, newPassword } = body as { phone?: unknown; code?: unknown; newPassword?: unknown };

  if (typeof phone !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ success: false, error: 'Phone, code, and new password are required.' }, { status: 400, headers: cors });
  }

  const passwordCheck = passwordSchema.safeParse(newPassword);
  if (!passwordCheck.success) {
    return NextResponse.json(
      { success: false, error: passwordCheck.error.issues[0]?.message ?? 'Password does not meet requirements.' },
      { status: 400, headers: cors },
    );
  }

  const chatId = normalizeWhatsAppChatId(phone);
  if (!chatId) {
    return NextResponse.json({ success: false, error: 'Invalid phone number.' }, { status: 400, headers: cors });
  }
  if (!/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ success: false, error: 'The code must be 6 digits.' }, { status: 400, headers: cors });
  }

  // Atomic: verify the OTP (single-use) THEN set the password.
  const otp = verifyWhatsAppOtp(chatId, code.trim());
  if (!otp.ok) {
    const message =
      otp.reason === 'too_many_attempts'
        ? 'Too many incorrect attempts. Request a new code.'
        : otp.reason === 'expired'
          ? 'The code has expired. Request a new one.'
          : 'Invalid code. Please try again.';
    const status = otp.reason === 'too_many_attempts' ? 429 : 400;
    return NextResponse.json({ success: false, error: message }, { status, headers: cors });
  }

  const user = await prisma.user.findFirst({
    where: { role: 'patient', phone: { in: phoneVariants(phone) } },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No patient account is registered with this number. Please sign up first.' },
      { status: 404, headers: cors },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await prisma.auditLog.create({
    data: {
      tableName: 'users',
      recordId: user.id,
      action: 'update',
      changedFields: { source: 'api.auth.patient.reset-password', field: 'passwordHash' },
      changedBy: `system_ip:${ip}`,
    },
  });

  return NextResponse.json({ success: true }, { status: 200, headers: cors });
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
