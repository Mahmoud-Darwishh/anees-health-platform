import { z } from 'zod';
import { optionalTrimmedString, optionalNumber, requiredDate, requiredPatientId } from './primitives';

export const recordVitalsSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    encounterId: optionalTrimmedString,
    recordedAt: requiredDate,
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
  .refine(
    (input) => input.painScore === null || (input.painScore >= 0 && input.painScore <= 10),
    'Pain score must be between 0 and 10.',
  );

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

