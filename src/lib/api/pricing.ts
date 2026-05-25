/**
 * Server-side pricing data access.
 * Prices are stored in the booking_prices table — change them in the DB,
 * no code deploy needed.
 */

import { prisma } from '@/lib/db/prisma';
import type { BookingPriceMap } from '@/lib/models/booking.types';

/** Hard-coded fallback used only when the DB row is missing */
const FALLBACK: BookingPriceMap = {
  telemedicine: 700,
  'package:haraka': 19500,
  'package:wai': 19500,
  'package:amal': 19500,
  'package:sanad:3m': 19500,
  'package:sanad:1y': 65000,
};

export async function getBookingPrices(): Promise<BookingPriceMap> {
  const rows = await prisma.bookingPrice.findMany({ where: { isActive: true } });
  const map: Record<string, number> = Object.fromEntries(rows.map((r) => [r.key, r.priceEgp]));

  return {
    telemedicine:       map['telemedicine']       ?? FALLBACK.telemedicine,
    'package:haraka':   map['package:haraka']     ?? FALLBACK['package:haraka'],
    'package:wai':      map['package:wai']        ?? FALLBACK['package:wai'],
    'package:amal':     map['package:amal']       ?? FALLBACK['package:amal'],
    'package:sanad:3m': map['package:sanad:3m']   ?? FALLBACK['package:sanad:3m'],
    'package:sanad:1y': map['package:sanad:1y']   ?? FALLBACK['package:sanad:1y'],
  };
}
