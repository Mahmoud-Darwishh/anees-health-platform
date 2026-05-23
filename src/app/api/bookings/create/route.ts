import { NextRequest, NextResponse } from 'next/server';
import { validateBookingForm, CreateBookingIntentRequest, calculateBookingPrice, type Specialty } from '@/lib/models/booking.types';
import { getBookingPrices } from '@/lib/api/pricing';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';

/** Hard server-side limits to prevent abuse via oversized payloads. */
const MAX = {
  fullName: 100,
  phoneNumber: 20,
  countryCode: 5,
  specialty: 50,
  userAgent: 500,
} as const;

function clip(value: string | undefined | null, max: number): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function buildPatientCode(): string {
  const randomId = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAT_${Date.now()}_${randomId}`;
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  try {
    // Rate limit: 10 bookings per minute per IP
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`booking-create:${ip}`, 10, 60_000);
    if (!allowed) return tooManyRequests(cors);

    const body: CreateBookingIntentRequest = await request.json();

    if (!body.fullName || !body.countryCode || !body.phoneNumber || !body.visitType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: fullName, countryCode, phoneNumber, visitType' },
        { status: 400, headers: cors },
      );
    }

    // Clip + sanitise oversized strings before they ever touch the DB
    const fullName = clip(body.fullName, MAX.fullName);
    const phoneNumber = clip(body.phoneNumber, MAX.phoneNumber);
    const countryCode = clip(body.countryCode, MAX.countryCode);
    const specialty = clip(body.specialty, MAX.specialty);

    if (!fullName || !phoneNumber || !countryCode) {
      return NextResponse.json(
        { success: false, message: 'Invalid input' },
        { status: 400, headers: cors },
      );
    }

    const formState = {
      fullName,
      countryCode,
      phoneNumber,
      visitType: body.visitType,
      packageType: body.packageType || null,
      serviceType: body.serviceType || null,
      specialty: (specialty as Specialty) || null,
      preferredDate: body.preferredDate || '',
      timePreference: body.timePreference || null,
      sessionCount: body.sessionCount || null,
      caseType: body.caseType || null,
      nursingType: body.nursingType || null,
      nursingHoursPerDay: body.nursingHoursPerDay || null,
      nursingDuration: body.nursingDuration || null,
    };

    const validationErrors = validateBookingForm(formState);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validationErrors },
        { status: 400, headers: cors },
      );
    }

    // Fetch authoritative prices from DB — never trust the client-side calculation
    const prices = await getBookingPrices();
    const amount = calculateBookingPrice(formState, prices);
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid booking configuration: could not calculate price' },
        { status: 400, headers: cors },
      );
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const bookingRef = `BOOKING_${timestamp}_${randomId}`;

    const userAgent = clip(request.headers.get('user-agent'), MAX.userAgent);

    const normalizedPhone = `${countryCode}${phoneNumber}`;
    const booking = await prisma.$transaction(async (tx) => {
      const existingPatient = await tx.patient.findFirst({
        where: { phone: normalizedPhone },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPatient) {
        await tx.patient.update({
          where: { id: existingPatient.id },
          data: { fullName, status: 'active' },
        });
      } else {
        await tx.patient.create({
          data: {
            code: buildPatientCode(),
            fullName,
            phone: normalizedPhone,
            status: 'new',
          },
        });
      }

      return tx.onlineBooking.create({
        data: {
          bookingRef,
          fullName,
          countryCode,
          phoneNumber,
          visitType: body.visitType as 'homeVisit' | 'telemedicine' | 'package',
          serviceType: body.serviceType as 'doctorVisit' | 'physiotherapy' | 'nursing' | undefined,
          specialty: specialty || undefined,
          packageType: body.packageType as 'haraka' | 'wai' | 'amal' | undefined,
          preferredDate: body.preferredDate ? new Date(body.preferredDate) : undefined,
          timePreference: body.timePreference,
          sessionCount: body.sessionCount,
          caseType: body.caseType,
          nursingType: body.nursingType,
          nursingHoursPerDay: body.nursingHoursPerDay,
          nursingDuration: body.nursingDuration,
          amountEgp: amount,
          currency: 'EGP',
          status: 'pending',
          ipAddress: ip,
          userAgent,
        },
      });
    });

    return NextResponse.json(
      { success: true, bookingId: booking.bookingRef, amount, currency: 'EGP' as const },
      { status: 201, headers: cors },
    );
  } catch (error) {
    console.error('[Booking API Error]', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create booking intent' },
      { status: 500, headers: cors },
    );
  }
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
