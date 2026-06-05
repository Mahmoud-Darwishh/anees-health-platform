import { z } from 'zod';

const optionalTrimmed = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  });

const requiredPatientId = z.string().trim().min(1, 'Patient id is required.');
const requiredGoalId = z.string().trim().min(1, 'Goal id is required.');

const goalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

const createGoalSchema = z.object({
  patientId: requiredPatientId,
  text: z.string().trim().min(3, 'Goal text is required.'),
  category: optionalTrimmed,
  baselineValue: optionalTrimmed,
  targetValue: optionalTrimmed,
  measurementUnit: optionalTrimmed,
  targetDate: goalDate,
});

const updateGoalProgressSchema = z.object({
  patientId: requiredPatientId,
  goalId: requiredGoalId,
  currentValue: z.string().trim().min(1, 'Current value is required.'),
});

const markGoalMetSchema = z.object({
  patientId: requiredPatientId,
  goalId: requiredGoalId,
});

const createDischargeSummarySchema = z.object({
  patientId: requiredPatientId,
  recommendations: z.string().trim().min(10, 'Discharge recommendations are required.'),
  followUpPlan: optionalTrimmed,
  includeAutoSummary: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => String(value ?? '').trim().toLowerCase() === 'yes'),
});

export type CreatePatientGoalInput = z.infer<typeof createGoalSchema>;
export type UpdatePatientGoalProgressInput = z.infer<typeof updateGoalProgressSchema>;
export type MarkPatientGoalMetInput = z.infer<typeof markGoalMetSchema>;
export type CreateDischargeSummaryInput = z.infer<typeof createDischargeSummarySchema>;

export function parseCreatePatientGoalForm(formData: FormData): CreatePatientGoalInput {
  return createGoalSchema.parse({
    patientId: formData.get('patientId'),
    text: formData.get('text'),
    category: formData.get('category'),
    baselineValue: formData.get('baselineValue'),
    targetValue: formData.get('targetValue'),
    measurementUnit: formData.get('measurementUnit'),
    targetDate: formData.get('targetDate'),
  });
}

export function parseUpdatePatientGoalProgressForm(formData: FormData): UpdatePatientGoalProgressInput {
  return updateGoalProgressSchema.parse({
    patientId: formData.get('patientId'),
    goalId: formData.get('goalId'),
    currentValue: formData.get('currentValue'),
  });
}

export function parseMarkPatientGoalMetForm(formData: FormData): MarkPatientGoalMetInput {
  return markGoalMetSchema.parse({
    patientId: formData.get('patientId'),
    goalId: formData.get('goalId'),
  });
}

export function parseCreateDischargeSummaryForm(formData: FormData): CreateDischargeSummaryInput {
  return createDischargeSummarySchema.parse({
    patientId: formData.get('patientId'),
    recommendations: formData.get('recommendations'),
    followUpPlan: formData.get('followUpPlan'),
    includeAutoSummary: formData.get('includeAutoSummary'),
  });
}