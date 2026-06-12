import { z } from 'zod';
import { optionalTrimmedString, requiredPatientId } from './primitives';

export const createClinicalNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  noteDiscipline: z.enum(['medical', 'nursing', 'physiotherapy']).default('medical'),
  noteTitle: optionalTrimmedString,
  noteBody: z.string().trim().min(1, 'Note body is required'),
});

export const signClinicalNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  compositionId: z.string().trim().min(1, 'Note id is required'),
  noteDiscipline: z.enum(['medical', 'nursing', 'physiotherapy']).default('medical'),
  noteVersionId: optionalTrimmedString,
});

export const amendClinicalNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  sourceCompositionId: z.string().trim().min(1, 'Source note id is required'),
  noteDiscipline: z.enum(['medical', 'nursing', 'physiotherapy']).default('medical'),
  amendmentTitle: optionalTrimmedString,
  amendmentBody: z.string().trim().min(1, 'Amendment body is required'),
});

