import { z } from 'zod';
import { optionalTrimmedString, optionalDate, requiredDate, requiredPatientId } from './primitives';

export const assignCareTeamSchema = z.object({
  medplumPatientId: requiredPatientId,
  staffId: z.string().trim().min(1, 'Staff id is required'),
  careTeamVersionId: optionalTrimmedString,
});

export const unassignCareTeamSchema = z.object({
  medplumPatientId: requiredPatientId,
  practitionerReference: z
    .string()
    .trim()
    .min(1, 'Practitioner reference is required'),
  careTeamVersionId: optionalTrimmedString,
});

export const createCareTaskSchema = z.object({
  medplumPatientId: requiredPatientId,
  taskTitle: z.string().trim().min(1, 'Task title is required'),
  taskDescription: optionalTrimmedString,
  taskDueDate: optionalDate,
  encounterId: optionalTrimmedString,
});

export const updateCareTaskStatusSchema = z.object({
  medplumPatientId: requiredPatientId,
  taskId: z.string().trim().min(1, 'Task id is required'),
  nextStatus: z.enum(['requested', 'in-progress', 'completed', 'on-hold', 'cancelled']),
  taskVersionId: optionalTrimmedString,
});

export const closeCareEpisodeSchema = z.object({
  medplumPatientId: requiredPatientId,
  episodeOutcomeSummary: z.string().trim().min(1, 'A discharge outcome summary is required'),
});

export const createCommunicationSchema = z.object({
  medplumPatientId: requiredPatientId,
  communicationCategory: z.enum(['clinical-update', 'handoff', 'escalation', 'incident']).default('clinical-update'),
  communicationPriority: z.enum(['routine', 'urgent', 'asap', 'stat']).default('routine'),
  communicationMessage: z.string().trim().min(1, 'Message is required'),
  communicationRecipientStaffId: optionalTrimmedString,
  communicationEncounterId: optionalTrimmedString,
  linkedTaskId: optionalTrimmedString,
});

export const createAppointmentSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    appointmentStart: requiredDate,
    appointmentEnd: requiredDate,
    appointmentType: z.enum(['in_home', 'clinic', 'virtual']).default('in_home'),
    appointmentNote: optionalTrimmedString,
    appointmentOwnerStaffId: optionalTrimmedString,
  })
  .superRefine((input, ctx) => {
    if (input.appointmentEnd <= input.appointmentStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['appointmentEnd'],
        message: 'Appointment end must be later than start.',
      });
    }
  });

