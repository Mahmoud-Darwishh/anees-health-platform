import { NextRequest, NextResponse } from 'next/server';
import { validateBookingForm, CreateBookingIntentRequest, calculateBookingPrice } from '@/lib/models/booking.types';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body: CreateBookingIntentRequest = await request.json();

    if (!body.fullName || !body.countryCode || !body.phoneNumber || !body.visitType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: fullName, countryCode, phoneNumber, visitType' },
        { status: 400 }
      );
    }

    const formState = {
      fullName: body.fullName,
      countryCode: body.countryCode,
      phoneNumber: body.phoneNumber,
      visitType: body.visitType,
      packageType: body.packageType || null,
      serviceType: body.serviceType || null,
      specialty: body.specialty || null,
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
        { status: 400 }
      );
    }

    const amount = calculateBookingPrice(formState);
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid booking configuration: could not calculate price' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const bookingRef = `BOOKING_${timestamp}_${randomId}`;

    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const booking = await prisma.onlineBooking.create({
      data: {
        bookingRef,
        fullName: body.fullName,
        countryCode: body.countryCode,
        phoneNumber: body.phoneNumber,
        visitType: body.visitType as 'homeVisit' | 'telemedicine' | 'package',
        serviceType: body.serviceType as 'doctorVisit' | 'physiotherapy' | 'nursing' | undefined,
        specialty: body.specialty,
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

    return NextResponse.json(
      { success: true, bookingId: booking.bookingRef, amount, currency: 'EGP' as const },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Booking API Error]', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create booking intent' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
