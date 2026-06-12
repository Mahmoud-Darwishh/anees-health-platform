import { z } from 'zod';
import { optionalTrimmedString, optionalDate, optionalSeverity, requiredPatientId } from './primitives';

export const createConditionSchema = z.object({
  medplumPatientId: requiredPatientId,
  conditionCategory: z.enum(['medical', 'physical_therapy']).default('medical'),
  conditionLabel: z.string().trim().min(1, 'Problem title is required'),
  conditionCode: optionalTrimmedString,
  conditionOnsetDate: optionalDate,
  conditionNote: optionalTrimmedString,
});

export const createAllergySchema = z.object({
  medplumPatientId: requiredPatientId,
  allergen: z.string().trim().min(1, 'Allergy substance is required'),
  allergySeverity: optionalSeverity,
  allergyNote: optionalTrimmedString,
});

export const retireConditionSchema = z.object({
  medplumPatientId: requiredPatientId,
  conditionId: z.string().trim().min(1, 'Condition id is required'),
});

export const retireAllergySchema = z.object({
  medplumPatientId: requiredPatientId,
  allergyId: z.string().trim().min(1, 'Allergy id is required'),
});

export const updateConditionStatusSchema = z.object({
  medplumPatientId: requiredPatientId,
  conditionId: z.string().trim().min(1, 'Condition id is required'),
  conditionStatus: z.enum(['active', 'resolved', 'inactive', 'remission']),
});

export const updateAllergyStatusSchema = z.object({
  medplumPatientId: requiredPatientId,
  allergyId: z.string().trim().min(1, 'Allergy id is required'),
  allergyStatus: z.enum(['active', 'inactive', 'resolved']),
});

