import { z } from 'zod';
import { optionalTrimmedString, requiredPatientId } from './primitives';

/**
 * A signed narrative nursing note (FHIR `Composition`, discipline = nursing).
 * Kept deliberately light for the field: a title + the note body. The author,
 * patient scope, licence and discipline are all resolved + enforced server-side
 * (never trusted from the form).
 */
export const createNursingNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  noteTitle: optionalTrimmedString,
  noteBody: z.string().trim().min(1, 'Note text is required'),
});

/**
 * A signed narrative physician note (FHIR `Composition`, discipline = medical).
 * Same light field shape as the nursing note — author, patient scope, licence and
 * the `medical` discipline are all resolved + enforced server-side. Signing is
 * gated on `note.medical.sign` (only a licensed doctor / admin may sign).
 */
export const createDoctorNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  noteTitle: optionalTrimmedString,
  noteBody: z.string().trim().min(1, 'Note text is required'),
});
