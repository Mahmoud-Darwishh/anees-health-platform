/**
 * Server-side pricing data access.
 * Prices are stored in the booking_prices table — change them in the DB,
 * no code deploy needed.
 */

import { prisma } from '@/lib/db/prisma';
import type { BookingPriceMap } from '@/lib/models/booking.types';

/** Hard-coded fallback used only when the DB row is missing */
const FALLBACK: BookingPriceMap = {
  telemedicine: 250,
  'homeVisit:doctorVisit': 1500,
  'homeVisit:physiotherapy:single': 900,
  'homeVisit:physiotherapy:twelve': 9500,
  'homeVisit:nursing:nurse': 150,
  'homeVisit:nursing:nurseAssistant': 100,
  'package:haraka': 5000,
  'package:wai': 8000,
  'package:amal': 6000,
};

export async function getBookingPrices(): Promise<BookingPriceMap> {
  const rows = await prisma.bookingPrice.findMany({ where: { isActive: true } });
  const map: Record<string, number> = Object.fromEntries(rows.map((r) => [r.key, r.priceEgp]));

  return {
    telemedicine:                    map['telemedicine']                    ?? FALLBACK.telemedicine,
    'homeVisit:doctorVisit':         map['homeVisit:doctorVisit']           ?? FALLBACK['homeVisit:doctorVisit'],
    'homeVisit:physiotherapy:single':map['homeVisit:physiotherapy:single']  ?? FALLBACK['homeVisit:physiotherapy:single'],
    'homeVisit:physiotherapy:twelve':map['homeVisit:physiotherapy:twelve']  ?? FALLBACK['homeVisit:physiotherapy:twelve'],
    'homeVisit:nursing:nurse':       map['homeVisit:nursing:nurse']         ?? FALLBACK['homeVisit:nursing:nurse'],
    'homeVisit:nursing:nurseAssistant':map['homeVisit:nursing:nurseAssistant'] ?? FALLBACK['homeVisit:nursing:nurseAssistant'],
    'package:haraka':                map['package:haraka']                  ?? FALLBACK['package:haraka'],
    'package:wai':                   map['package:wai']                     ?? FALLBACK['package:wai'],
    'package:amal':                  map['package:amal']                    ?? FALLBACK['package:amal'],
  };
}
