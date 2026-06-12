import { z } from 'zod';
import { optionalTrimmedString, optionalDate, requiredPatientId } from './primitives';

export const createDocumentSchema = z.object({
  medplumPatientId: requiredPatientId,
  documentTitle: z.string().trim().min(1, 'Document title is required'),
  documentCategory: z.enum(['report', 'lab', 'imaging', 'insurance', 'consent', 'other']).default('report'),
  documentDate: optionalDate,
  documentNote: optionalTrimmedString,
});

export const deleteDocumentSchema = z.object({
  medplumPatientId: requiredPatientId,
  documentId: z.string().trim().min(1, 'Document id is required'),
});

export const requestDocumentDeleteApprovalSchema = z.object({
  medplumPatientId: requiredPatientId,
  documentId: z.string().trim().min(1, 'Document id is required'),
  deleteApprovalReason: z.string().trim().min(8, 'Delete approval reason is required.'),
});

