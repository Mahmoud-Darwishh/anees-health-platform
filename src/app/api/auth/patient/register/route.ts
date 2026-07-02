import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';
import { normalizeWhatsAppChatId } from '@/lib/auth/wapilot';
import { verifyWhatsAppOtp } from '@/lib/auth/whatsapp-otp-store';
import { phoneVariants, phonesMatch } from '@/lib/auth/phone-variants';

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  const ip = getClientIp(request);

  const limited = await checkRateLimit(`patient-register:${ip}`, 5, 15 * 60 * 1000, true);
  if (!limited) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please wait 15 minutes.' },
      { status: 429, headers: cors }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: cors });
  }

  const { name, phone, caseId, password, code } = body as Record<string, string>;

  if (!name?.trim() || !phone?.trim() || !caseId?.trim() || !password) {
    return NextResponse.json(
      { error: 'All fields are required.' },
      { status: 400, headers: cors }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400, headers: cors }
    );
  }

  // Validate the phone as a WhatsApp-reachable number and derive the OTP chat id.
  // `normalizeWhatsAppChatId` accepts local Egyptian formats (01…) as well as
  // international ones, so a valid local number is no longer rejected.
  const chatId = normalizeWhatsAppChatId(phone);
  if (!chatId) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400, headers: cors });
  }

  // Possession proof: a 6-digit WhatsApp OTP the caller must have received.
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json(
      { error: 'A valid 6-digit verification code is required.' },
      { status: 400, headers: cors }
    );
  }

  const cleanPhone = phone.replace(/\s+/g, '');

  // Find the Patient record by Case ID
  const patient = await prisma.patient.findUnique({
    where: { code: caseId.trim().toUpperCase() },
    select: { id: true, phone: true, userAccount: { select: { id: true } } },
  });

  if (!patient) {
    // Deliberately vague — don't reveal if case ID exists
    return NextResponse.json(
      { error: 'Case ID or phone number does not match our records.' },
      { status: 400, headers: cors }
    );
  }

  // Verify phone matches the patient record (Egypt-aware across formats).
  if (!patient.phone || !phonesMatch(phone, patient.phone)) {
    return NextResponse.json(
      { error: 'Case ID or phone number does not match our records.' },
      { status: 400, headers: cors }
    );
  }

  // Reject if this Patient already has a user account
  if (patient.userAccount) {
    return NextResponse.json(
      { error: 'An account already exists for this Case ID. Please sign in.' },
      { status: 409, headers: cors }
    );
  }

  // Reject if phone is already taken by another User (any stored format).
  const phoneConflict = await prisma.user.findFirst({
    where: { phone: { in: phoneVariants(phone) } },
    select: { id: true },
  });
  if (phoneConflict) {
    return NextResponse.json(
      { error: 'This phone number is already registered. Please sign in.' },
      { status: 409, headers: cors }
    );
  }

  // All non-destructive checks passed — now consume the OTP (single-use). Doing
  // this last means a wrong Case ID doesn't burn the caller's valid code.
  const otp = verifyWhatsAppOtp(chatId, code.trim());
  if (!otp.ok) {
    const message =
      otp.reason === 'too_many_attempts'
        ? 'Too many incorrect attempts. Request a new code.'
        : otp.reason === 'expired'
          ? 'The code has expired. Request a new one.'
          : otp.reason === 'not_found'
            ? 'No verification code was requested for this number. Request a new one.'
            : 'Invalid code. Please try again.';
    const status = otp.reason === 'too_many_attempts' ? 429 : 400;
    return NextResponse.json({ error: message }, { status, headers: cors });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      phone: cleanPhone,
      passwordHash,
      role: 'patient',
      patientId: patient.id,
    },
    select: { id: true, name: true, phone: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      tableName: 'users',
      recordId: user.id,
      action: 'create',
      changedFields: {
        source: 'api.auth.patient.register',
        fields: ['name', 'phone', 'role', 'patientId'],
      },
      changedBy: `system_ip:${ip}`,
    },
  });

  return NextResponse.json(
    { success: true, user: { id: user.id, name: user.name } },
    { status: 201, headers: cors }
  );
}
