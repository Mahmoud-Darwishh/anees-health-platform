import { NextRequest, NextResponse } from 'next/server';
import {
  validateBookingForm,
  CreateBookingIntentRequest,
  calculateBookingPrice,
  BookingFormState,
  PackageType,
  PackageDuration,
  getPackageEntry,
} from '@/lib/models/booking.types';
import { getBookingPrices } from '@/lib/api/pricing';
import { isWithinCoverage, normalizeGovernorate } from '@/lib/config/coverage-area';
import { validatePromocode, claimPromocodeWithinTx } from '@/lib/api/promocode';
import { prisma } from '@/lib/db/prisma';
import { upsertMedplumPatient } from '@/lib/medplum/patients';
import { logger } from '@/lib/utils/app-logger';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';

/** Hard server-side limits to prevent abuse via oversized payloads. */
const MAX = {
  fullName: 100,
  phoneNumber: 20,
  countryCode: 5,
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

    if (!fullName || !phoneNumber || !countryCode) {
      return NextResponse.json(
        { success: false, message: 'Invalid input' },
        { status: 400, headers: cors },
      );
    }

    // Only accept the two live visit tracks; reject retired homeVisit funnel.
    if (body.visitType !== 'telemedicine' && body.visitType !== 'package') {
      return NextResponse.json(
        { success: false, message: 'Invalid visitType' },
        { status: 400, headers: cors },
      );
    }

    // Coverage gate — in-home (package) care is limited to Greater Cairo at
    // launch. Block out-of-area BEFORE any payment. Telemedicine is remote, so
    // it is exempt. Missing governorate on a package is a client/validation
    // error; an explicit out-of-area answer gets a clear, actionable message.
    const governorate = normalizeGovernorate(body.governorate);
    if (body.visitType === 'package') {
      if (!governorate) {
        return NextResponse.json(
          { success: false, message: 'Please select your governorate.' },
          { status: 400, headers: cors },
        );
      }
      if (!isWithinCoverage(governorate)) {
        return NextResponse.json(
          {
            success: false,
            outOfCoverage: true,
            message: 'We currently serve in-home visits in Greater Cairo (Cairo & Giza) only.',
          },
          { status: 422, headers: cors },
        );
      }
    }

    const packageType: PackageType | null =
      body.visitType === 'package' && body.packageType ? body.packageType : null;

    // Derive duration server-side: '3m' default for non-sanad, explicit for sanad.
    let packageDuration: PackageDuration | null = null;
    if (body.visitType === 'package' && packageType) {
      const entry = getPackageEntry(packageType);
      if (entry) {
        if (entry.durations.length === 1) {
          packageDuration = entry.durations[0].value;
        } else if (body.packageDuration === '3m' || body.packageDuration === '1y') {
          packageDuration = body.packageDuration;
        }
      }
    }

    const formState: BookingFormState = {
      fullName,
      countryCode,
      phoneNumber,
      visitType: body.visitType,
      packageType,
      packageDuration,
      governorate,
      // Legacy fields — always null in the new funnel.
      serviceType: null,
      specialty: null,
      preferredDate: '',
      timePreference: null,
      sessionCount: null,
      caseType: null,
      nursingType: null,
      nursingHoursPerDay: null,
      nursingDuration: null,
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
    const baseAmount = calculateBookingPrice(formState, prices);
    if (baseAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid booking configuration: could not calculate price' },
        { status: 400, headers: cors },
      );
    }

    // Optional promocode — validated server-side, never trust client discount math
    let promoId: string | null = null;
    let promoCode: string | null = null;
    let discountEgp = 0;
    let amount = baseAmount;
    const rawPromo = clip(body.promocode, 64);
    if (rawPromo) {
      const promoResult = await validatePromocode(rawPromo, baseAmount);
      if (!promoResult.ok) {
        return NextResponse.json(
          { success: false, message: 'Invalid promo code', promocodeError: promoResult.error },
          { status: 400, headers: cors },
        );
      }
      promoId = promoResult.promocode.id;
      promoCode = promoResult.promocode.code;
      discountEgp = promoResult.discountEgp;
      amount = promoResult.finalAmountEgp;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const bookingRef = `BOOKING_${timestamp}_${randomId}`;

    const userAgent = clip(request.headers.get('user-agent'), MAX.userAgent);

    const normalizedPhone = `${countryCode}${phoneNumber}`;
    const { booking, patient } = await prisma.$transaction(async (tx) => {
      const existingPatient = await tx.patient.findFirst({
        where: { phone: normalizedPhone },
        orderBy: { createdAt: 'desc' },
      });

      const patientAction = existingPatient ? 'update' : 'create';
      const patient = existingPatient
        ? await tx.patient.update({
            where: { id: existingPatient.id },
            // Identity is phone-keyed, and the booker may be booking *for someone
            // else* on their own phone (or simply mistype). Never overwrite an
            // established patient's canonical name from a booking form — the
            // booker-provided name is preserved on `OnlineBooking.fullName`
            // instead. We only (re)activate the record.
            data: { status: 'active' },
            select: {
              id: true,
              code: true,
              fullName: true,
              phone: true,
              gender: true,
              dateOfBirth: true,
              nationalId: true,
              medplumPatientId: true,
            },
          })
        : await tx.patient.create({
            data: {
              code: buildPatientCode(),
              fullName,
              phone: normalizedPhone,
              status: 'new',
            },
            select: {
              id: true,
              code: true,
              fullName: true,
              phone: true,
              gender: true,
              dateOfBirth: true,
              nationalId: true,
              medplumPatientId: true,
            },
          });

      await tx.auditLog.create({
        data: {
          tableName: 'patients',
          recordId: patient.id,
          action: patientAction,
          changedFields: {
            source: 'api.booking.create',
            fields: existingPatient ? ['status'] : ['fullName', 'status', 'phone'],
          },
          changedBy: `system_ip:${ip}`,
        },
      });

      // Re-claim promocode atomically to defend against races on usage limits
      if (promoId) {
        const claimed = await claimPromocodeWithinTx(tx, promoId);
        if (!claimed) {
          throw new Error('PROMOCODE_RACE');
        }
      }

      const booking = await tx.onlineBooking.create({
        data: {
          bookingRef,
          fullName,
          countryCode,
          phoneNumber,
          visitType: body.visitType as 'telemedicine' | 'package',
          packageType: packageType ?? undefined,
          packageDuration: packageDuration ?? undefined,
          baseAmountEgp: baseAmount,
          discountEgp,
          amountEgp: amount,
          currency: 'EGP',
          status: 'pending',
          governorate: governorate ?? undefined,
          promocodeId: promoId ?? undefined,
          promocodeCode: promoCode ?? undefined,
          ipAddress: ip,
          userAgent,
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: 'online_bookings',
          recordId: booking.id,
          action: 'create',
          changedFields: {
            source: 'api.booking.create',
            fields: ['status', 'amountEgp', 'discountEgp', 'promocodeCode'],
            bookingRef: booking.bookingRef,
          },
          changedBy: `system_ip:${ip}`,
        },
      });

      return { booking, patient };
    });

    try {
      const synced = await upsertMedplumPatient({
        code: patient.code,
        fullName: patient.fullName,
        phone: patient.phone,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        nationalId: patient.nationalId,
        medplumPatientId: patient.medplumPatientId,
      });

      // Persist the Medplum id so future syncs read-by-id instead of searching.
      if (synced.id && synced.id !== patient.medplumPatientId) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { medplumPatientId: synced.id },
        });

        await prisma.auditLog.create({
          data: {
            tableName: 'patients',
            recordId: patient.id,
            action: 'update',
            changedFields: {
              source: 'api.booking.create.medplum-link',
              fields: ['medplumPatientId'],
            },
            changedBy: `system_ip:${ip}`,
          },
        });
      }
    } catch (error) {
      logger.warn('Booking created but Medplum patient sync failed', {
        bookingRef: booking.bookingRef,
        patientId: patient.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.bookingRef,
        amount,
        baseAmount,
        discount: discountEgp,
        promocode: promoCode,
        currency: 'EGP' as const,
      },
      { status: 201, headers: cors },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'PROMOCODE_RACE') {
      return NextResponse.json(
        { success: false, message: 'Promo code is no longer available', promocodeError: 'usage_limit' },
        { status: 409, headers: cors },
      );
    }
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
