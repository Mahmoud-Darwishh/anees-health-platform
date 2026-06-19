/**
 * Booking Form Types & Constants
 * Defines data models, pricing rules, and form state for the booking system.
 *
 * Current product (May 2026):
 *   • Telemedicine — single consultation
 *   • Packages    — Haraka / Wai / Amal / Sanad
 *     - Haraka, Wai, Amal: flat 3-month program
 *     - Sanad: choose 3 months OR 1 year
 *
 * Home-visit options (doctor/physio/nursing) are intentionally retired in
 * this funnel. The DB enums still retain the old variants for back-compat
 * with historical bookings; do not reintroduce them in the UI.
 */

import { isWithinCoverage } from '@/lib/config/coverage-area';

// ============================================================================
// PRICING MAP — keys match booking_prices.key in DB.
// ============================================================================
export interface BookingPriceMap {
  telemedicine: number;
  'package:haraka': number;
  'package:wai': number;
  'package:amal': number;
  'package:sanad:3m': number;
  'package:sanad:1y': number;
}

/** Hard-coded fallback used by the client when DB load fails. */
const DEFAULT_PRICES: BookingPriceMap = {
  telemedicine: 700,
  'package:haraka': 19500,
  'package:wai': 19500,
  'package:amal': 19500,
  'package:sanad:3m': 19500,
  'package:sanad:1y': 65000,
};

// ============================================================================
// BOOKING TYPES
// ============================================================================

export type VisitType = 'telemedicine' | 'package';
export type PackageType = 'haraka' | 'wai' | 'amal' | 'sanad';
export type PackageDuration = '3m' | '1y';

// Legacy types — preserved only because shared helpers and the DB still
// reference them. Do not surface in the UI.
export type ServiceType = 'doctorVisit' | 'physiotherapy' | 'nursing';
export type Specialty = 'generalMedicine' | 'pediatrics' | 'orthopedics' | 'cardiology' | 'dermatology';
export type TimePreference = 'morning' | 'evening' | 'doesntMatter';
export type PhysiotherapySessions = '1' | '12';
export type PhysiotherapyCaseType = 'postoperative' | 'fracture' | 'neuro' | 'other';
export type NursingType = 'nurse' | 'nursingAssistant';
export type NursingHours = '8hrs' | '12hrs' | '24hrs';
export type NursingDuration = '1week' | '2weeks' | '1month';

// ============================================================================
// BOOKING FORM STATE
// ============================================================================

export interface BookingFormState {
  // Personal info
  fullName: string;
  countryCode: string;
  phoneNumber: string;

  // Service selection
  visitType: VisitType | null;
  packageType: PackageType | null;
  packageDuration: PackageDuration | null; // required only when packageType === 'sanad'

  // Promo (preview only; revalidated on server)
  promocode?: string | null;

  // Coverage gate (in-home/package only): 'cairo' | 'giza' | 'other'. Telemedicine
  // is remote, so it is not coverage-gated and leaves this null.
  governorate?: string | null;

  // ── Legacy retired fields (kept as null so existing helpers don't crash) ──
  serviceType: ServiceType | null;
  specialty: Specialty | null;
  preferredDate: string;
  timePreference: TimePreference | null;
  sessionCount: PhysiotherapySessions | null;
  caseType: PhysiotherapyCaseType | null;
  nursingType: NursingType | null;
  nursingHoursPerDay: NursingHours | null;
  nursingDuration: NursingDuration | null;
}

// ============================================================================
// BOOKING SUMMARY
// ============================================================================

export interface BookingSummary extends BookingFormState {
  totalPrice: number;
  currency: 'EGP';
}

// ============================================================================
// API REQUEST/RESPONSE
// ============================================================================

export interface CreateBookingIntentRequest {
  fullName: string;
  countryCode: string;
  phoneNumber: string;
  visitType: VisitType;
  packageType?: PackageType;
  packageDuration?: PackageDuration;
  promocode?: string;
  governorate?: string;
}

export interface BookingValidationError {
  field: string;
  message: string;
}

// ============================================================================
// PACKAGE CATALOG — single source of truth for the product cards.
// ============================================================================

export interface PackageCatalogEntry {
  value: PackageType;
  /** i18n key under `booking.packages.<value>.title` */
  titleKey: string;
  /** i18n key under `booking.packages.<value>.subtitle` */
  subtitleKey: string;
  /** Decorative emoji for the card (no locale variant needed). */
  emoji: string;
  /** Featured / "most popular" — shown with a highlight badge. */
  featured?: boolean;
  /** Duration options. Single-entry array = no duration toggle. */
  durations: Array<{ value: PackageDuration; priceKey: keyof BookingPriceMap; labelKey: string }>;
}

export const PACKAGE_CATALOG: readonly PackageCatalogEntry[] = [
  {
    value: 'sanad',
    titleKey: 'booking.packages.sanad.title',
    subtitleKey: 'booking.packages.sanad.subtitle',
    emoji: '🤝',
    featured: true,
    durations: [
      { value: '3m', priceKey: 'package:sanad:3m', labelKey: 'booking.packages.duration.3m' },
      { value: '1y', priceKey: 'package:sanad:1y', labelKey: 'booking.packages.duration.1y' },
    ],
  },
  {
    value: 'haraka',
    titleKey: 'booking.packages.haraka.title',
    subtitleKey: 'booking.packages.haraka.subtitle',
    emoji: '🦵',
    durations: [
      { value: '3m', priceKey: 'package:haraka', labelKey: 'booking.packages.duration.3m' },
    ],
  },
  {
    value: 'wai',
    titleKey: 'booking.packages.wai.title',
    subtitleKey: 'booking.packages.wai.subtitle',
    emoji: '🧠',
    durations: [
      { value: '3m', priceKey: 'package:wai', labelKey: 'booking.packages.duration.3m' },
    ],
  },
  {
    value: 'amal',
    titleKey: 'booking.packages.amal.title',
    subtitleKey: 'booking.packages.amal.subtitle',
    emoji: '💗',
    durations: [
      { value: '3m', priceKey: 'package:amal', labelKey: 'booking.packages.duration.3m' },
    ],
  },
] as const;

export function getPackageEntry(value: PackageType | null): PackageCatalogEntry | undefined {
  if (!value) return undefined;
  return PACKAGE_CATALOG.find((p) => p.value === value);
}

// Retained for legacy summary helpers — empty lists so nothing renders.
export const SPECIALTIES: ReadonlyArray<{ value: string; label: string }> = [];
export const PHYSIOTHERAPY_CASE_TYPES: ReadonlyArray<{ value: string; label: string }> = [];
export const NURSING_TYPES: ReadonlyArray<{ value: string; label: string }> = [];
export const NURSING_HOURS: ReadonlyArray<{ value: string; label: string }> = [];
export const NURSING_DURATIONS: ReadonlyArray<{ value: string; label: string }> = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total booking price based on selections.
 *
 * On the server (booking create route) always pass DB prices — they are authoritative.
 * On the client (live preview) pass the prices received as props from the server page.
 */
export function calculateBookingPrice(state: BookingFormState, prices?: BookingPriceMap): number {
  const p = prices ?? DEFAULT_PRICES;

  if (state.visitType === 'telemedicine') {
    return p.telemedicine;
  }

  if (state.visitType === 'package') {
    const entry = getPackageEntry(state.packageType);
    if (!entry) return 0;
    const duration =
      entry.durations.length === 1
        ? entry.durations[0]
        : entry.durations.find((d) => d.value === state.packageDuration);
    if (!duration) return 0;
    return p[duration.priceKey] ?? 0;
  }

  return 0;
}

/**
 * Validate booking form data.
 */
export function validateBookingForm(state: BookingFormState): BookingValidationError[] {
  const errors: BookingValidationError[] = [];

  if (!state.fullName?.trim()) {
    errors.push({ field: 'fullName', message: 'booking.validation.fullNameRequired' });
  }

  if (!state.countryCode?.trim()) {
    errors.push({ field: 'countryCode', message: 'booking.validation.countryCodeRequired' });
  }

  if (!state.phoneNumber?.trim()) {
    errors.push({ field: 'phoneNumber', message: 'booking.validation.phoneNumberRequired' });
  }

  if (state.phoneNumber && !/^[0-9]{10}$/.test(state.phoneNumber.replace(/\s/g, ''))) {
    errors.push({ field: 'phoneNumber', message: 'booking.validation.invalidPhoneNumber' });
  }

  if (!state.visitType) {
    errors.push({ field: 'visitType', message: 'booking.validation.visitTypeRequired' });
  }

  if (state.visitType === 'package') {
    const entry = getPackageEntry(state.packageType);
    if (!entry) {
      errors.push({ field: 'packageType', message: 'booking.validation.packageTypeRequired' });
    } else if (entry.durations.length > 1 && !state.packageDuration) {
      errors.push({ field: 'packageDuration', message: 'booking.validation.packageDurationRequired' });
    }

    // In-home care is coverage-gated to Greater Cairo. Telemedicine is remote
    // and therefore exempt (no governorate required).
    if (!state.governorate) {
      errors.push({ field: 'governorate', message: 'booking.validation.governorateRequired' });
    } else if (!isWithinCoverage(state.governorate)) {
      errors.push({ field: 'governorate', message: 'booking.form.outOfCoverage' });
    }
  }

  return errors;
}

/**
 * Get service type display key (legacy helper kept for older code paths).
 */
export function getServiceLabel(): string {
  return '';
}


