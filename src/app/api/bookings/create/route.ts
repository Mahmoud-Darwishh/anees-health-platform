import { NextRequest, NextResponse } from 'next/server';
import { validateBookingForm, CreateBookingIntentRequest, CreateBookingIntentResponse, calculateBookingPrice } from '@/lib/models/booking.types';

/**
 * POST /api/bookings/create
 * 
 * Creates a booking intent and returns booking ID + calculated amount
 * This endpoint validates the booking data server-side and calculates final price
 * Server-side calculation prevents price tampering on the client
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateBookingIntentRequest = await request.json();

    // Validate required fields
    if (!body.fullName || !body.phoneNumber || !body.visitType) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: fullName, phoneNumber, visitType',
        },
        { status: 400 }
      );
    }

    // Construct form state from request
    const formState = {
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      visitType: body.visitType,
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

    // Validate form state
    const validationErrors = validateBookingForm(formState);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Calculate price server-side (prevents tampering)
    const amount = calculateBookingPrice(formState);

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid booking configuration: could not calculate price',
        },
        { status: 400 }
      );
    }

    // Generate unique booking ID
    // Format: BOOKING_[timestamp]_[randomId]
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const bookingId = `BOOKING_${timestamp}_${randomId}`;

    // TODO: Store booking in database
    // - Save form state with booking ID
    // - Set status to 'pending' until payment is confirmed
    // - Log booking creation for audit

    // For now, we'll just create the booking intent
    // In production, this would be stored in a database
    console.log('[Booking Intent Created]', {
      bookingId,
      amount,
      timestamp: new Date(timestamp).toISOString(),
      customer: body.fullName,
      phone: body.phoneNumber,
    });

    const response: CreateBookingIntentResponse = {
      success: true,
      bookingId,
      amount,
      currency: 'EGP',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[Booking API Error]', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create booking intent',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
