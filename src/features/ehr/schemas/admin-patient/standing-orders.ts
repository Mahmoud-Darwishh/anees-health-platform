import { z } from 'zod';
import { optionalTrimmedString, optionalDate, requiredDate, requiredPatientId } from './primitives';

export const createStandingOrderSchema = z.object({
  medplumPatientId: requiredPatientId,
  standingOrderDiscipline: z.enum(['medical', 'nursing', 'physiotherapy']).default('medical'),
  standingOrderTitle: z.string().trim().min(1, 'Standing order title is required.'),
  standingOrderInstructions: z.string().trim().min(8, 'Standing order instructions are required.'),
  standingOrderValidUntil: optionalDate,
});

export const executeStandingOrderSchema = z.object({
  medplumPatientId: requiredPatientId,
  standingOrderId: z.string().trim().min(1, 'Standing order id is required.'),
  executionVisitId: z.string().trim().min(1, 'Visit id is required for standing order execution.'),
  executionRecordedAt: requiredDate,
  executionNote: optionalTrimmedString,
});

