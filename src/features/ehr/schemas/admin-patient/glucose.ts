import { z } from 'zod';
import {
  GLUCOSE_TIMING_VALUES,
  GLUCOSE_MEAL_VALUES,
} from '@/lib/clinical/glucose-profile';
import { isPlausibleEnteredGlucose, type GlucoseUnit } from '@/lib/clinical/glucose-units';
import { optionalTrimmedString, optionalBoolean, requiredDate, requiredPatientId } from './primitives';

const glucoseValue = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return Number.NaN;
    const trimmed = String(value).trim();
    if (!trimmed) return Number.NaN;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => Number.isFinite(value), 'A glucose value is required.');

export const recordGlucoseSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    encounterId: optionalTrimmedString,
    recordedAt: requiredDate,
    glucoseTiming: z.enum(GLUCOSE_TIMING_VALUES),
    glucoseMeal: z
      .union([z.enum(GLUCOSE_MEAL_VALUES), z.literal(''), z.null(), z.undefined()])
      .transform((value) => (value ? value : null)),
    glucoseUnit: z
      .union([z.enum(['mg/dL', 'mmol/L']), z.null(), z.undefined()])
      .transform((value): GlucoseUnit => (value === 'mmol/L' ? 'mmol/L' : 'mg/dL')),
    glucoseValue,
    glucoseSymptomatic: optionalBoolean,
    glucoseTreatment: optionalTrimmedString,
    glucoseNote: optionalTrimmedString,
  })
  .refine(
    (input) => isPlausibleEnteredGlucose(input.glucoseValue, input.glucoseUnit),
    'Glucose reading is outside the plausible range — check the value and the selected unit.',
  )
  .refine(
    // A meal label is required for pre/post-meal timings (otherwise the reading has
    // no home in the logbook grid); fasting / bedtime / overnight / random do not.
    (input) =>
      (input.glucoseTiming !== 'pre_meal' && input.glucoseTiming !== 'post_meal') ||
      input.glucoseMeal !== null,
    'Select which meal this pre/post-meal reading relates to.',
  );

export type RecordGlucoseInput = z.infer<typeof recordGlucoseSchema>;
