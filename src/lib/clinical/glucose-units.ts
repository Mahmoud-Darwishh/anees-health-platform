/**
 * Blood-glucose unit handling.
 *
 * Canonical storage is ALWAYS mg/dL. mmol/L is a display / data-entry convenience
 * only — convert at the I/O boundary, never persist mmol/L. Every clinical decision
 * (hypo detection, target bands, eHbA1c) runs on the canonical mg/dL value, so a
 * change of display unit can never change the medicine.
 *
 * This module is pure (no server-only, no FHIR) so it is safe to use on both the
 * client and the server, and is unit-tested by `scripts/glucose-profile-selftest.cjs`.
 */

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export const GLUCOSE_UNITS: GlucoseUnit[] = ['mg/dL', 'mmol/L'];
export const CANONICAL_GLUCOSE_UNIT: GlucoseUnit = 'mg/dL';

/** Molar-mass conversion for glucose (180.16 g/mol): 1 mmol/L = 18.0182 mg/dL. */
export const MG_DL_PER_MMOL_L = 18.0182;

/** Plausibility window for a canonical mg/dL reading (rejects typos / wrong unit). */
export const MIN_PLAUSIBLE_MG_DL = 20;
export const MAX_PLAUSIBLE_MG_DL = 600;

export function isGlucoseUnit(value: unknown): value is GlucoseUnit {
  return value === 'mg/dL' || value === 'mmol/L';
}

export function mgDlToMmolL(mgDl: number): number {
  return Math.round((mgDl / MG_DL_PER_MMOL_L) * 10) / 10;
}

export function mmolLToMgDl(mmol: number): number {
  return Math.round(mmol * MG_DL_PER_MMOL_L);
}

/** Convert a value entered in `unit` into the canonical mg/dL integer for storage. */
export function toCanonicalMgDl(value: number, unit: GlucoseUnit): number {
  return unit === 'mmol/L' ? mmolLToMgDl(value) : Math.round(value);
}

/** Render a canonical mg/dL value in the requested display unit (string, rounded). */
export function formatGlucose(mgDl: number, unit: GlucoseUnit = CANONICAL_GLUCOSE_UNIT): string {
  return unit === 'mmol/L' ? mgDlToMmolL(mgDl).toFixed(1) : String(Math.round(mgDl));
}

export function isPlausibleMgDl(mgDl: number): boolean {
  return Number.isFinite(mgDl) && mgDl >= MIN_PLAUSIBLE_MG_DL && mgDl <= MAX_PLAUSIBLE_MG_DL;
}

/**
 * Is a value entered in `unit` plausible as a real reading? Used at the validation
 * boundary so a mmol/L value typed into a mg/dL field (or vice-versa) is rejected
 * before it can be stored.
 */
export function isPlausibleEnteredGlucose(value: number, unit: GlucoseUnit): boolean {
  if (!Number.isFinite(value) || value <= 0) {
    return false;
  }
  return isPlausibleMgDl(toCanonicalMgDl(value, unit));
}
