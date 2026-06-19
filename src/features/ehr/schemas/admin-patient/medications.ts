import { z } from 'zod';
import { optionalTrimmedString, optionalNumber, optionalDate, requiredPatientId } from './primitives';

export const createMedicationSchema = z.object({
  medplumPatientId: requiredPatientId,
  medicationName: z.string().trim().min(1, 'Medication name is required'),
  /** RxNorm code from the formulary picker; empty for a free-text fallback med. */
  medicationRxnorm: optionalTrimmedString,
  dosageText: optionalTrimmedString,
  routeText: optionalTrimmedString,
  frequencyText: optionalTrimmedString,
  startDate: optionalDate,
  medicationDurationDays: optionalNumber,
  medicationNote: optionalTrimmedString,
});

export const createMedicationAdministrationSchema = z.object({
  medplumPatientId: requiredPatientId,
  medicationStatementId: optionalTrimmedString,
  medicationName: z.string().trim().min(1, 'Medication name is required'),
  encounterId: optionalTrimmedString,
  administrationStatus: z.enum(['given', 'refused', 'held']).default('given'),
  scheduledAt: optionalDate,
  administeredAt: optionalDate,
  administrationReason: optionalTrimmedString,
  administrationNote: optionalTrimmedString,
});

export const updateMedicationStatusSchema = z.object({
  medplumPatientId: requiredPatientId,
  medicationId: z.string().trim().min(1, 'Medication id is required'),
  medicationManageStatus: z.enum(['active', 'on-hold', 'completed', 'stopped']),
});

export const retireMedicationSchema = z.object({
  medplumPatientId: requiredPatientId,
  medicationId: z.string().trim().min(1, 'Medication id is required'),
});

export const retireMedicationAdministrationSchema = z.object({
  medplumPatientId: requiredPatientId,
  administrationId: z.string().trim().min(1, 'Administration id is required'),
});

