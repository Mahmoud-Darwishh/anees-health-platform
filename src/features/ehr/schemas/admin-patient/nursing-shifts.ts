import { z } from 'zod';
import { optionalTrimmedString, requiredDate, requiredPatientId } from './primitives';

export const createNurseShiftAssignmentSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    primaryNurseStaffId: z.string().trim().min(1, 'Primary nurse is required'),
    shiftStartAt: requiredDate,
    shiftEndAt: requiredDate,
    shiftNotes: optionalTrimmedString,
  })
  .superRefine((input, ctx) => {
    if (input.shiftEndAt <= input.shiftStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shiftEndAt'],
        message: 'Shift end must be later than shift start.',
      });
    }
  });

export const acknowledgeIncomingNurseSchema = z.object({
  medplumPatientId: requiredPatientId,
  assignmentId: z.string().trim().min(1, 'Shift assignment id is required'),
  incomingNurseStaffId: optionalTrimmedString,
  acknowledgedAt: requiredDate,
  acknowledgementNote: optionalTrimmedString,
});

