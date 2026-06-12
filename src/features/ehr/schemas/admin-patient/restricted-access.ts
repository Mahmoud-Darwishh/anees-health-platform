import { z } from 'zod';
import { requiredPatientId } from './primitives';

export const requestRestrictedAccessSchema = z.object({
  medplumPatientId: requiredPatientId,
  restrictedAccessReason: z.string().trim().min(12, 'Restricted-access reason must be at least 12 characters.'),
});

export const requestBreakGlassAccessSchema = z.object({
  medplumPatientId: requiredPatientId,
  breakGlassReason: z.string().trim().min(20, 'Break-glass reason must be at least 20 characters.'),
});

export const approveDestructiveTokenSchema = z.object({
  medplumPatientId: requiredPatientId,
  approvalTokenId: z.string().trim().min(1, 'Approval token id is required.'),
});

