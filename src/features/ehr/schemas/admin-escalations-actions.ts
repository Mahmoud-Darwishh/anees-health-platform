import { z } from 'zod';

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined));

export const updateEscalationStatusSchema = z.object({
  taskId: z.string().trim().min(1, 'Task id is required'),
  taskVersionId: z.string().trim().min(1, 'Task version is required'),
  nextStatus: z.enum(['accepted', 'in-progress', 'on-hold', 'completed', 'cancelled']),
  medplumPatientId: optionalTrimmedString,
});

export function escalationFormDataToInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    taskId: formData.get('taskId'),
    taskVersionId: formData.get('taskVersionId'),
    nextStatus: formData.get('nextStatus'),
    medplumPatientId: formData.get('medplumPatientId'),
  };
}
