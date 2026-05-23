import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  const session = await auth();

  if (!session || session.user.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: cors });
  }
  if (session.user.patientId) {
    return NextResponse.json({ error: 'Account already linked.' }, { status: 409, headers: cors });
  }

  const ip = getClientIp(request);
  const limited = await checkRateLimit(`patient-link:${ip}`, 5, 15 * 60 * 1000);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait 15 minutes.' },
      { status: 429, headers: cors }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: cors });
  }

  const { caseId, phone } = body as Record<string, string>;
  if (!caseId?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Case ID and phone are required.' }, { status: 400, headers: cors });
  }

  const patient = await prisma.patient.findUnique({
    where: { code: caseId.trim().toUpperCase() },
    select: { id: true, phone: true, userAccount: { select: { id: true } } },
  });

  if (!patient) {
    return NextResponse.json(
      { error: 'Case ID or phone number does not match our records.' },
      { status: 400, headers: cors }
    );
  }

  const normalizedInput = phone.trim().replace(/^(\+20|0020|00)/, '0');
  const normalizedRecord = (patient.phone ?? '').replace(/^(\+20|0020|00)/, '0');
  if (normalizedInput !== normalizedRecord) {
    return NextResponse.json(
      { error: 'Case ID or phone number does not match our records.' },
      { status: 400, headers: cors }
    );
  }

  if (patient.userAccount && patient.userAccount.id !== session.user.id) {
    return NextResponse.json(
      { error: 'This patient record is already linked to another account.' },
      { status: 409, headers: cors }
    );
  }

  // TODO(audit): wire when auth lands — patient account linking event
  await prisma.user.update({
    where: { id: session.user.id },
    data: { patientId: patient.id },
  });

  return NextResponse.json({ success: true }, { status: 200, headers: cors });
}
