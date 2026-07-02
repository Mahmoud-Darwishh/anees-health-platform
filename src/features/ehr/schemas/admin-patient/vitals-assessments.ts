import { z } from 'zod';
import { optionalTrimmedString, optionalNumber, clinicLocalDate, requiredPatientId } from './primitives';

/** Physiological plausibility bounds — a hard server-side guard against typos
 *  (e.g. a weight of 700kg or an SpO2 of 950%). Not a clinical-normal range. */
const VITAL_BOUNDS: Record<string, { min: number; max: number; label: string }> = {
  systolicBp: { min: 40, max: 300, label: 'Systolic BP (40–300 mmHg)' },
  diastolicBp: { min: 20, max: 200, label: 'Diastolic BP (20–200 mmHg)' },
  heartRate: { min: 20, max: 300, label: 'Heart rate (20–300 bpm)' },
  respiratoryRate: { min: 3, max: 80, label: 'Respiratory rate (3–80 /min)' },
  temperatureC: { min: 25, max: 45, label: 'Temperature (25–45 °C)' },
  glucoseMgDl: { min: 10, max: 1500, label: 'Glucose (10–1500 mg/dL)' },
  weightKg: { min: 0.3, max: 500, label: 'Weight (0.3–500 kg)' },
  heightCm: { min: 10, max: 260, label: 'Height (10–260 cm)' },
  spo2Pct: { min: 40, max: 100, label: 'SpO₂ (40–100 %)' },
  painScore: { min: 0, max: 10, label: 'Pain score (0–10)' },
};

export const recordVitalsSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    encounterId: optionalTrimmedString,
    recordedAt: clinicLocalDate,
    systolicBp: optionalNumber,
    diastolicBp: optionalNumber,
    heartRate: optionalNumber,
    respiratoryRate: optionalNumber,
    temperatureC: optionalNumber,
    glucoseMgDl: optionalNumber,
    weightKg: optionalNumber,
    heightCm: optionalNumber,
    spo2Pct: optionalNumber,
    painScore: optionalNumber,
  })
  .refine(
    (input) =>
      !((input.systolicBp !== null && input.diastolicBp === null) ||
        (input.systolicBp === null && input.diastolicBp !== null)),
    'Blood pressure needs both systolic and diastolic values.',
  )
  .refine(
    (input) =>
      [
        input.systolicBp,
        input.diastolicBp,
        input.heartRate,
        input.respiratoryRate,
        input.temperatureC,
        input.glucoseMgDl,
        input.weightKg,
        input.heightCm,
        input.spo2Pct,
        input.painScore,
      ].some((value) => value !== null),
    'Provide at least one vital value.',
  )
  .superRefine((input, ctx) => {
    for (const [field, bound] of Object.entries(VITAL_BOUNDS)) {
      const value = (input as unknown as Record<string, number | null>)[field];
      if (value === null || value === undefined || Number.isNaN(value)) continue;
      if (value < bound.min || value > bound.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${bound.label} is out of the plausible range.`,
        });
      }
    }
  });

export const createAssessmentSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    /** Validated-instrument key (e.g. `braden`); empty for a free-text assessment. */
    assessmentInstrument: optionalTrimmedString,
    assessmentTitle: optionalTrimmedString,
    assessmentType: z.enum(['functional', 'mobility', 'pain', 'other']).default('other'),
    assessmentScore: optionalNumber,
    assessmentSummary: z.string().trim().min(1, 'Assessment summary is required'),
    assessmentNote: optionalTrimmedString,
    assessmentEncounterId: optionalTrimmedString,
  })
  .refine((input) => Boolean(input.assessmentInstrument || input.assessmentTitle), {
    message: 'Choose a validated instrument or enter a title.',
    path: ['assessmentTitle'],
  });

