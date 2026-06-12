import { z } from 'zod';
import { optionalTrimmedString, optionalDate, optionalBoolean, requiredPatientId } from './primitives';

export const createIncidentReportSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  incidentType: z.enum(['fall', 'med_error', 'pressure_injury', 'equipment_failure', 'near_miss', 'other']),
  incidentSeverity: z.enum(['routine', 'urgent', 'asap', 'stat']).default('urgent'),
  incidentSummary: z.string().trim().min(1, 'Incident summary is required'),
  incidentActionsTaken: optionalTrimmedString,
  incidentEscalationNeeded: optionalBoolean,
});

export const createEscalationSchema = z.object({
  medplumPatientId: requiredPatientId,
  escalationTitle: z.string().trim().min(1, 'Escalation title is required'),
  escalationSummary: z.string().trim().min(1, 'Escalation summary is required'),
  escalationPriority: z.enum(['routine', 'urgent', 'asap', 'stat']).default('urgent'),
  escalationDueDate: optionalDate,
  escalationEncounterId: optionalTrimmedString,
  escalationOwnerStaffId: optionalTrimmedString,
});

