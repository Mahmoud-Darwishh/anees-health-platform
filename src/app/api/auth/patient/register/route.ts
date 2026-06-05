import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  const ip = getClientIp(request);

  const limited = await checkRateLimit(`patient-register:${ip}`, 5, 15 * 60 * 1000);
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

  const { name, phone, caseId, password } = body as Record<string, string>;

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

  // Validate phone format (basic — Egyptian numbers or international)
  const cleanPhone = phone.replace(/\s+/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400, headers: cors });
  }

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

  // Verify phone matches the patient record
  const normalizedInput = cleanPhone.replace(/^(\+20|0020|00)/, '0');
  const normalizedRecord = (patient.phone ?? '').replace(/^(\+20|0020|00)/, '0');
  if (normalizedInput !== normalizedRecord) {
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

  // Reject if phone is already taken by another User
  const phoneConflict = await prisma.user.findUnique({ where: { phone: cleanPhone } });
  if (phoneConflict) {
    return NextResponse.json(
      { error: 'This phone number is already registered. Please sign in.' },
      { status: 409, headers: cors }
    );
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
