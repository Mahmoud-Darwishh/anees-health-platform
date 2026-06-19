/**
 * Validated assessment-instrument catalog (app-owned, PURE — no I/O, no PHI).
 *
 * Replaces the old generic, phantom `Questionnaire/anees-assessment` with real,
 * scored, risk-banded instruments. Each instrument defines its valid score range,
 * a LOINC code where one exists (+ an Anees code), the measurement direction, and
 * clinically-standard risk bands. The scoring helper validates the range and
 * returns the band, which the assessment writer stamps onto the FHIR Observation
 * as `interpretation`.
 *
 * Add an instrument by adding a row here — no other change needed. Being pure,
 * this module is usable from both server and client (the forms render the list).
 */

export type RiskSeverity = 'low' | 'moderate' | 'high';

export type RiskBand = {
  /** Inclusive lower/upper bounds of the raw score for this band. */
  min: number;
  max: number;
  label: string;
  severity: RiskSeverity;
};

export type AssessmentInstrument = {
  key: string;
  /** Full clinician-facing name. */
  label: string;
  shortName: string;
  /** Stable Anees instrument code (within `assessment-instrument` system). */
  aneesCode: string;
  /** Optional LOINC code, added as a secondary coding for interoperability. */
  loinc?: string;
  unit: string; // UCUM; '{score}' for unit-less scores
  min: number;
  max: number;
  /** Maps to the `assessmentType` enum stored on the assessment. */
  category: 'functional' | 'mobility' | 'pain';
  /** Higher score = better outcome (e.g. MMSE) vs worse (e.g. Morse). */
  higherIsBetter: boolean;
  bands: RiskBand[];
  /** One-line range + cutoff reminder shown in the UI. */
  reference: string;
};

export const ASSESSMENT_INSTRUMENTS: Record<string, AssessmentInstrument> = {
  braden: {
    key: 'braden',
    label: 'Braden Scale (pressure-injury risk)',
    shortName: 'Braden',
    aneesCode: 'braden',
    loinc: '38228-2',
    unit: '{score}',
    min: 6,
    max: 23,
    category: 'functional',
    higherIsBetter: true,
    reference: 'Range 6–23; ≤9 severe, 19–23 minimal risk.',
    bands: [
      { min: 6, max: 9, label: 'Severe risk', severity: 'high' },
      { min: 10, max: 12, label: 'High risk', severity: 'high' },
      { min: 13, max: 14, label: 'Moderate risk', severity: 'moderate' },
      { min: 15, max: 18, label: 'Mild risk', severity: 'moderate' },
      { min: 19, max: 23, label: 'Minimal / no risk', severity: 'low' },
    ],
  },
  morse: {
    key: 'morse',
    label: 'Morse Fall Scale',
    shortName: 'Morse',
    aneesCode: 'morse-fall',
    unit: '{score}',
    min: 0,
    max: 125,
    category: 'mobility',
    higherIsBetter: false,
    reference: 'Range 0–125; 0–24 low, 25–44 moderate, ≥45 high.',
    bands: [
      { min: 0, max: 24, label: 'Low fall risk', severity: 'low' },
      { min: 25, max: 44, label: 'Moderate fall risk', severity: 'moderate' },
      { min: 45, max: 125, label: 'High fall risk', severity: 'high' },
    ],
  },
  mmse: {
    key: 'mmse',
    label: 'Mini-Mental State Examination',
    shortName: 'MMSE',
    aneesCode: 'mmse',
    loinc: '72106-8',
    unit: '{score}',
    min: 0,
    max: 30,
    category: 'functional',
    higherIsBetter: true,
    reference: 'Range 0–30; 24–30 normal, ≤9 severe impairment.',
    bands: [
      { min: 0, max: 9, label: 'Severe impairment', severity: 'high' },
      { min: 10, max: 18, label: 'Moderate impairment', severity: 'high' },
      { min: 19, max: 23, label: 'Mild impairment', severity: 'moderate' },
      { min: 24, max: 30, label: 'Normal cognition', severity: 'low' },
    ],
  },
  berg: {
    key: 'berg',
    label: 'Berg Balance Scale',
    shortName: 'Berg',
    aneesCode: 'berg',
    unit: '{score}',
    min: 0,
    max: 56,
    category: 'mobility',
    higherIsBetter: true,
    reference: 'Range 0–56; 0–20 high fall risk, 41–56 low.',
    bands: [
      { min: 0, max: 20, label: 'High fall risk', severity: 'high' },
      { min: 21, max: 40, label: 'Moderate fall risk', severity: 'moderate' },
      { min: 41, max: 56, label: 'Low fall risk', severity: 'low' },
    ],
  },
  tug: {
    key: 'tug',
    label: 'Timed Up and Go',
    shortName: 'TUG',
    aneesCode: 'tug',
    unit: 's',
    min: 0,
    max: 600,
    category: 'mobility',
    higherIsBetter: false,
    reference: 'Seconds; <10 low, ≥13.5 elevated fall risk, ≥20 high.',
    bands: [
      { min: 0, max: 9.9, label: 'Low fall risk', severity: 'low' },
      { min: 10, max: 19.9, label: 'Moderate fall risk', severity: 'moderate' },
      { min: 20, max: 600, label: 'High fall risk', severity: 'high' },
    ],
  },
  nprs: {
    key: 'nprs',
    label: 'Numeric Pain Rating Scale',
    shortName: 'NPRS',
    aneesCode: 'nprs',
    loinc: '72514-3',
    unit: '{score}',
    min: 0,
    max: 10,
    category: 'pain',
    higherIsBetter: false,
    reference: 'Range 0–10; 1–3 mild, 4–6 moderate, 7–10 severe.',
    bands: [
      { min: 0, max: 0, label: 'No pain', severity: 'low' },
      { min: 1, max: 3, label: 'Mild pain', severity: 'low' },
      { min: 4, max: 6, label: 'Moderate pain', severity: 'moderate' },
      { min: 7, max: 10, label: 'Severe pain', severity: 'high' },
    ],
  },
};

export function listInstruments(): AssessmentInstrument[] {
  return Object.values(ASSESSMENT_INSTRUMENTS);
}

export function getInstrument(key: string | null | undefined): AssessmentInstrument | null {
  if (!key) return null;
  return ASSESSMENT_INSTRUMENTS[key] ?? null;
}

export type AssessmentScoring =
  | { valid: false; error: string; band: null }
  | { valid: true; error: null; band: RiskBand | null };

/**
 * Validate a raw score against an instrument's range and resolve its risk band.
 * Pure — returns `valid:false` with a clinician-facing error for out-of-range or
 * unknown-instrument input.
 */
export function scoreAssessment(key: string, value: number): AssessmentScoring {
  const instrument = getInstrument(key);
  if (!instrument) {
    return { valid: false, error: 'Unknown assessment instrument.', band: null };
  }
  if (!Number.isFinite(value) || value < instrument.min || value > instrument.max) {
    return {
      valid: false,
      error: `${instrument.shortName} score must be between ${instrument.min} and ${instrument.max}.`,
      band: null,
    };
  }
  const band = instrument.bands.find((b) => value >= b.min && value <= b.max) ?? null;
  return { valid: true, error: null, band };
}
