import { z } from 'zod';
import { optionalTrimmedString, optionalDate, requiredPatientId } from './primitives';

export const createLabOrderSchema = z.object({
  medplumPatientId: requiredPatientId,
  labOrderTitle: z.string().trim().min(1, 'Lab order title is required'),
  labOrderCategory: z.enum(['lab', 'imaging', 'other']).default('lab'),
  labOrderCode: optionalTrimmedString,
  labOrderDate: optionalDate,
  labOrderNote: optionalTrimmedString,
});

export const addLabResultSchema = z.object({
  medplumPatientId: requiredPatientId,
  diagnosticReportId: optionalTrimmedString,
  basedOnOrderId: optionalTrimmedString,
  analyteLabel: z.string().trim().min(1, 'Analyte is required'),
  analyteKey: optionalTrimmedString,
  labResultValue: z.coerce.number(),
  labResultEffectiveOn: optionalDate,
});

export const createDiagnosticReportSchema = z.object({
  medplumPatientId: requiredPatientId,
  diagnosticTitle: z.string().trim().min(1, 'Report title is required'),
  diagnosticCategory: z.enum(['lab', 'imaging', 'other']).default('lab'),
  diagnosticStatus: z.enum(['registered', 'partial', 'preliminary', 'final', 'amended', 'corrected', 'appended', 'cancelled', 'entered-in-error', 'unknown']).default('final'),
  diagnosticConclusion: optionalTrimmedString,
  diagnosticIssuedOn: optionalDate,
  diagnosticEffectiveOn: optionalDate,
  diagnosticNote: optionalTrimmedString,
  linkedLabOrderId: optionalTrimmedString,
});

