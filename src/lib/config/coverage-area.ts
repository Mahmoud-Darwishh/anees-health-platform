/**
 * SERVICE COVERAGE AREA — launch scope: Greater Cairo (Cairo + Giza).
 * --------------------------------------------------------------------
 * Pure, runtime-agnostic (safe on client + server). The booking funnel uses
 * this to BLOCK in-home bookings outside the covered governorates before any
 * payment is taken. Telemedicine is remote and therefore NOT coverage-gated.
 *
 * Expanding the service area later = add a governorate here (one place).
 */

export const COVERED_GOVERNORATES = ['cairo', 'giza'] as const;
export type CoveredGovernorate = (typeof COVERED_GOVERNORATES)[number];

/** Selectable values in the booking form (covered + an explicit out-of-area option). */
export const GOVERNORATE_OPTIONS = ['cairo', 'giza', 'other'] as const;

export const COVERAGE_AREA_LABEL_EN = 'Greater Cairo (Cairo & Giza)';
export const COVERAGE_AREA_LABEL_AR = 'القاهرة الكبرى (القاهرة والجيزة)';

export function normalizeGovernorate(value?: string | null): string | null {
  const next = (value ?? '').trim().toLowerCase();
  return next || null;
}

export function isWithinCoverage(value?: string | null): boolean {
  const normalized = normalizeGovernorate(value);
  return normalized !== null && (COVERED_GOVERNORATES as readonly string[]).includes(normalized);
}
