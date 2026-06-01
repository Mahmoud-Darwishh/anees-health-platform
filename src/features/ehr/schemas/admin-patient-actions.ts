import { z } from 'zod';

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined));

const optionalHttpsUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed || undefined;
  })
  .refine((value) => !value || /^https:\/\//i.test(value), 'Location link must start with https://');

const optionalNumber = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => value === null || Number.isFinite(value), 'Invalid number value');

const requiredLatitude = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return Number.NaN;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => Number.isFinite(value), 'Current latitude is required')
  .refine((value) => value >= -90 && value <= 90, 'Latitude must be between -90 and 90');

const requiredLongitude = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return Number.NaN;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => Number.isFinite(value), 'Current longitude is required')
  .refine((value) => value >= -180 && value <= 180, 'Longitude must be between -180 and 180');

const optionalAccuracyMeters = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => value === null || Number.isFinite(value), 'Invalid location accuracy value')
  .refine((value) => value === null || value >= 0, 'Location accuracy must be positive');

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

const optionalSeverity = z
  .union([z.enum(['mild', 'moderate', 'severe']), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value ? value : undefined));

const optionalBoolean = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'yes' || normalized === 'true') return true;
    if (normalized === 'no' || normalized === 'false') return false;
    return null;
  });

const requiredDate = z
  .string()
  .trim()
  .refine((value) => !!value, 'Required date value is missing')
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date value');

const requiredPatientId = z.string().trim().min(1, 'Patient id is required');
const optionalEmail = optionalTrimmedString.transform((value) => value?.toLowerCase());

export const recordVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  status: z.enum(['planned', 'in-progress', 'completed', 'cancelled']),
  visitType: z.enum(['in_home', 'clinic', 'virtual']),
  startAt: requiredDate,
  notes: optionalTrimmedString,
});

export const recordVitalsSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    encounterId: optionalTrimmedString,
    recordedAt: requiredDate,
    systolicBp: optionalNumber,
    diastolicBp: optionalNumber,
    heartRate: optionalNumber,
    temperatureC: optionalNumber,
    glucoseMgDl: optionalNumber,
    weightKg: optionalNumber,
    spo2Pct: optionalNumber,
    painScore: optionalNumber,
  })
  .refine(
    (input) =>
      !((input.systolicBp !== null && input.diastolicBp === null) ||
        (input.systolicBp === null && input.diastolicBp !== null)),
    'Blood pressure needs both systolic and diastolic values.',
  )
  .refine(
    (input) =>
      [
        input.systolicBp,
        input.diastolicBp,
        input.heartRate,
        input.temperatureC,
        input.glucoseMgDl,
        input.weightKg,
        input.spo2Pct,
        input.painScore,
      ].some((value) => value !== null),
    'Provide at least one vital value.',
  )
  .refine(
    (input) => input.painScore === null || (input.painScore >= 0 && input.painScore <= 10),
    'Pain score must be between 0 and 10.',
  );

export const createClinicalNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  noteTitle: optionalTrimmedString,
  noteBody: z.string().trim().min(1, 'Note body is required'),
});

export const signClinicalNoteSchema = z.object({
  medplumPatientId: requiredPatientId,
  compositionId: z.string().trim().min(1, 'Note id is required'),
  noteVersionId: optionalTrimmedString,
});

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

export const createNursingReportSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  noteBody: z.string().trim().min(1, 'Nursing note body is required'),
  conditionSummary: optionalTrimmedString,
  escalationNeeded: optionalBoolean,
  followUpPlan: optionalTrimmedString,
});

export const createNursingShiftHandoffSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    encounterId: optionalTrimmedString,
    shiftStartAt: requiredDate,
    shiftEndAt: requiredDate,
    patientStatusSummary: z.string().trim().min(1, 'Patient status summary is required'),
    pendingTasksSummary: z.string().trim().min(1, 'Pending tasks summary is required'),
    medicationSafetySummary: z.string().trim().min(1, 'Medication safety summary is required'),
    escalationStatus: z.enum(['none', 'active', 'resolved']).default('none'),
    nextShiftFocus: z.string().trim().min(1, 'Next shift focus is required'),
    handoffNote: z.string().trim().min(1, 'Clinical handoff note is required'),
    handoffLatitude: requiredLatitude,
    handoffLongitude: requiredLongitude,
    handoffAccuracyMeters: optionalAccuracyMeters,
    handoffConfirmed: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => String(value ?? '').trim().toLowerCase())
      .refine((value) => value === 'true' || value === 'on' || value === 'yes', 'You must confirm the handoff attestation before submit.'),
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

export const createPhysioReportSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  noteBody: z.string().trim().min(1, 'Physiotherapy note body is required'),
  interventions: optionalTrimmedString,
  painBefore: optionalNumber,
  painAfter: optionalNumber,
  responseSummary: optionalTrimmedString,
  homePlan: optionalTrimmedString,
});

export const createConditionSchema = z.object({
  medplumPatientId: requiredPatientId,
  conditionLabel: z.string().trim().min(1, 'Problem title is required'),
  conditionCode: optionalTrimmedString,
  conditionOnsetDate: optionalDate,
  conditionNote: optionalTrimmedString,
});

export const createAllergySchema = z.object({
  medplumPatientId: requiredPatientId,
  allergen: z.string().trim().min(1, 'Allergy substance is required'),
  allergyReaction: optionalTrimmedString,
  allergySeverity: optionalSeverity,
  allergyOnsetDate: optionalDate,
  allergyNote: optionalTrimmedString,
});

export const createMedicationSchema = z.object({
  medplumPatientId: requiredPatientId,
  medicationName: z.string().trim().min(1, 'Medication name is required'),
  dosageText: optionalTrimmedString,
  routeText: optionalTrimmedString,
  frequencyText: optionalTrimmedString,
  medicationStatus: z.enum(['active', 'completed', 'stopped', 'entered-in-error', 'intended', 'not-taken', 'on-hold']).default('active'),
  startDate: optionalDate,
  endDate: optionalDate,
  medicationNote: optionalTrimmedString,
});

export const createMedicationAdministrationSchema = z.object({
  medplumPatientId: requiredPatientId,
  medicationStatementId: optionalTrimmedString,
  medicationName: z.string().trim().min(1, 'Medication name is required'),
  encounterId: optionalTrimmedString,
  administrationStatus: z.enum(['given', 'refused', 'held']).default('given'),
  scheduledAt: optionalDate,
  administeredAt: requiredDate,
  administrationReason: optionalTrimmedString,
  administrationNote: optionalTrimmedString,
});

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

export const createLabOrderSchema = z.object({
  medplumPatientId: requiredPatientId,
  labOrderTitle: z.string().trim().min(1, 'Lab order title is required'),
  labOrderCategory: z.enum(['lab', 'imaging', 'other']).default('lab'),
  labOrderCode: optionalTrimmedString,
  labOrderDate: optionalDate,
  labOrderNote: optionalTrimmedString,
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

export const createAssessmentSchema = z.object({
  medplumPatientId: requiredPatientId,
  assessmentTitle: z.string().trim().min(1, 'Assessment title is required'),
  assessmentType: z.enum(['functional', 'mobility', 'pain', 'other']).default('other'),
  assessmentScore: optionalNumber,
  assessmentSummary: z.string().trim().min(1, 'Assessment summary is required'),
  assessmentNote: optionalTrimmedString,
  assessmentEncounterId: optionalTrimmedString,
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

export const createIncidentReportSchema = z.object({
  medplumPatientId: requiredPatientId,
  encounterId: optionalTrimmedString,
  incidentType: z.enum(['fall', 'med_error', 'pressure_injury', 'equipment_failure', 'near_miss', 'other']),
  incidentSeverity: z.enum(['routine', 'urgent', 'asap', 'stat']).default('urgent'),
  incidentSummary: z.string().trim().min(1, 'Incident summary is required'),
  incidentActionsTaken: optionalTrimmedString,
  incidentEscalationNeeded: optionalBoolean,
});

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

export const updatePatientGeoPolicySchema = z.object({
  medplumPatientId: requiredPatientId,
  handoffGeofenceRadiusMeters: optionalNumber.refine(
    (value) => value === null || (value >= 50 && value <= 5000),
    'Geofence radius must be between 50 and 5000 meters.',
  ),
  temporarilyAwayUntil: optionalDate,
  temporarilyAwayNote: optionalTrimmedString,
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

export const updatePatientDemographicsSchema = z.object({
  medplumPatientId: requiredPatientId,
  patientVersionId: optionalTrimmedString,
  addressDetail: optionalTrimmedString,
  landmark: optionalTrimmedString,
  addressMapUrl: optionalHttpsUrl,
  emergencyContactName: optionalTrimmedString,
  emergencyContactPhone: optionalTrimmedString,
  emergencyContactRelation: optionalTrimmedString,
});

export const upsertCaregiverConsentSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    consentId: optionalTrimmedString,
    consentVersionId: optionalTrimmedString,
    caregiverPhone: optionalTrimmedString,
    caregiverEmail: optionalEmail,
    decision: z.enum(['allow', 'deny']),
    scopeProfile: z.union([z.string(), z.null(), z.undefined()]).transform((value) => String(value ?? '').trim().length > 0),
    scopeVisits: z.union([z.string(), z.null(), z.undefined()]).transform((value) => String(value ?? '').trim().length > 0),
    scopeVitals: z.union([z.string(), z.null(), z.undefined()]).transform((value) => String(value ?? '').trim().length > 0),
    scopeNotes: z.union([z.string(), z.null(), z.undefined()]).transform((value) => String(value ?? '').trim().length > 0),
    scopeTasks: z.union([z.string(), z.null(), z.undefined()]).transform((value) => String(value ?? '').trim().length > 0),
  })
  .superRefine((input, ctx) => {
    if (!input.caregiverPhone && !input.caregiverEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['caregiverPhone'],
        message: 'Provide caregiver phone or email.',
      });
    }

    const selectedScopeCount = [
      input.scopeProfile,
      input.scopeVisits,
      input.scopeVitals,
      input.scopeNotes,
      input.scopeTasks,
    ].filter(Boolean).length;

    if (input.decision === 'allow' && selectedScopeCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeProfile'],
        message: 'Select at least one scope when consent decision is allow.',
      });
    }
  })
  .transform((input) => ({
    medplumPatientId: input.medplumPatientId,
    consentId: input.consentId,
    consentVersionId: input.consentVersionId,
    caregiverPhone: input.caregiverPhone,
    caregiverEmail: input.caregiverEmail,
    decision: input.decision,
    scopes: [
      input.scopeProfile ? 'profile' : null,
      input.scopeVisits ? 'visits' : null,
      input.scopeVitals ? 'vitals' : null,
      input.scopeNotes ? 'notes' : null,
      input.scopeTasks ? 'tasks' : null,
    ].filter((scope): scope is 'profile' | 'visits' | 'vitals' | 'notes' | 'tasks' => !!scope),
  }));

export function formDataToInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    medplumPatientId: formData.get('medplumPatientId'),
    encounterId: formData.get('encounterId'),
    status: formData.get('status'),
    visitType: formData.get('visitType'),
    startAt: formData.get('startAt'),
    notes: formData.get('notes'),
    recordedAt: formData.get('recordedAt'),
    systolicBp: formData.get('systolicBp'),
    diastolicBp: formData.get('diastolicBp'),
    heartRate: formData.get('heartRate'),
    temperatureC: formData.get('temperatureC'),
    glucoseMgDl: formData.get('glucoseMgDl'),
    weightKg: formData.get('weightKg'),
    spo2Pct: formData.get('spo2Pct'),
    painScore: formData.get('painScore'),
    noteTitle: formData.get('noteTitle'),
    noteBody: formData.get('noteBody'),
    compositionId: formData.get('compositionId'),
    noteVersionId: formData.get('noteVersionId'),
    staffId: formData.get('staffId'),
    practitionerReference: formData.get('practitionerReference'),
    careTeamVersionId: formData.get('careTeamVersionId'),
    taskTitle: formData.get('taskTitle'),
    taskDescription: formData.get('taskDescription'),
    taskDueDate: formData.get('taskDueDate'),
    taskId: formData.get('taskId'),
    nextStatus: formData.get('nextStatus'),
    taskVersionId: formData.get('taskVersionId'),
    conditionSummary: formData.get('conditionSummary'),
    escalationNeeded: formData.get('escalationNeeded'),
    followUpPlan: formData.get('followUpPlan'),
    shiftStartAt: formData.get('shiftStartAt'),
    shiftEndAt: formData.get('shiftEndAt'),
    patientStatusSummary: formData.get('patientStatusSummary'),
    pendingTasksSummary: formData.get('pendingTasksSummary'),
    medicationSafetySummary: formData.get('medicationSafetySummary'),
    escalationStatus: formData.get('escalationStatus'),
    nextShiftFocus: formData.get('nextShiftFocus'),
    handoffNote: formData.get('handoffNote'),
    handoffLatitude: formData.get('handoffLatitude'),
    handoffLongitude: formData.get('handoffLongitude'),
    handoffAccuracyMeters: formData.get('handoffAccuracyMeters'),
    handoffConfirmed: formData.get('handoffConfirmed'),
    interventions: formData.get('interventions'),
    painBefore: formData.get('painBefore'),
    painAfter: formData.get('painAfter'),
    responseSummary: formData.get('responseSummary'),
    homePlan: formData.get('homePlan'),
    conditionLabel: formData.get('conditionLabel'),
    conditionCode: formData.get('conditionCode'),
    conditionOnsetDate: formData.get('conditionOnsetDate'),
    conditionNote: formData.get('conditionNote'),
    allergen: formData.get('allergen'),
    allergyReaction: formData.get('allergyReaction'),
    allergySeverity: formData.get('allergySeverity'),
    allergyOnsetDate: formData.get('allergyOnsetDate'),
    allergyNote: formData.get('allergyNote'),
    medicationName: formData.get('medicationName'),
    dosageText: formData.get('dosageText'),
    routeText: formData.get('routeText'),
    frequencyText: formData.get('frequencyText'),
    medicationStatus: formData.get('medicationStatus'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    medicationNote: formData.get('medicationNote'),
    medicationStatementId: formData.get('medicationStatementId'),
    administrationStatus: formData.get('administrationStatus'),
    scheduledAt: formData.get('scheduledAt'),
    administeredAt: formData.get('administeredAt'),
    administrationReason: formData.get('administrationReason'),
    administrationNote: formData.get('administrationNote'),
    documentTitle: formData.get('documentTitle'),
    documentId: formData.get('documentId'),
    documentCategory: formData.get('documentCategory'),
    documentDate: formData.get('documentDate'),
    documentNote: formData.get('documentNote'),
    labOrderTitle: formData.get('labOrderTitle'),
    labOrderCategory: formData.get('labOrderCategory'),
    labOrderCode: formData.get('labOrderCode'),
    labOrderDate: formData.get('labOrderDate'),
    labOrderNote: formData.get('labOrderNote'),
    diagnosticTitle: formData.get('diagnosticTitle'),
    diagnosticCategory: formData.get('diagnosticCategory'),
    diagnosticStatus: formData.get('diagnosticStatus'),
    diagnosticConclusion: formData.get('diagnosticConclusion'),
    diagnosticIssuedOn: formData.get('diagnosticIssuedOn'),
    diagnosticEffectiveOn: formData.get('diagnosticEffectiveOn'),
    diagnosticNote: formData.get('diagnosticNote'),
    linkedLabOrderId: formData.get('linkedLabOrderId'),
    assessmentTitle: formData.get('assessmentTitle'),
    assessmentType: formData.get('assessmentType'),
    assessmentScore: formData.get('assessmentScore'),
    assessmentSummary: formData.get('assessmentSummary'),
    assessmentNote: formData.get('assessmentNote'),
    assessmentEncounterId: formData.get('assessmentEncounterId'),
    communicationCategory: formData.get('communicationCategory'),
    communicationPriority: formData.get('communicationPriority'),
    communicationMessage: formData.get('communicationMessage'),
    communicationRecipientStaffId: formData.get('communicationRecipientStaffId'),
    communicationEncounterId: formData.get('communicationEncounterId'),
    linkedTaskId: formData.get('linkedTaskId'),
    incidentType: formData.get('incidentType'),
    incidentSeverity: formData.get('incidentSeverity'),
    incidentSummary: formData.get('incidentSummary'),
    incidentActionsTaken: formData.get('incidentActionsTaken'),
    incidentEscalationNeeded: formData.get('incidentEscalationNeeded'),
    escalationTitle: formData.get('escalationTitle'),
    escalationSummary: formData.get('escalationSummary'),
    escalationPriority: formData.get('escalationPriority'),
    escalationDueDate: formData.get('escalationDueDate'),
    escalationEncounterId: formData.get('escalationEncounterId'),
    escalationOwnerStaffId: formData.get('escalationOwnerStaffId'),
    appointmentStart: formData.get('appointmentStart'),
    appointmentEnd: formData.get('appointmentEnd'),
    appointmentType: formData.get('appointmentType'),
    appointmentNote: formData.get('appointmentNote'),
    appointmentOwnerStaffId: formData.get('appointmentOwnerStaffId'),
    primaryNurseStaffId: formData.get('primaryNurseStaffId'),
    shiftNotes: formData.get('shiftNotes'),
    assignmentId: formData.get('assignmentId'),
    incomingNurseStaffId: formData.get('incomingNurseStaffId'),
    acknowledgedAt: formData.get('acknowledgedAt'),
    acknowledgementNote: formData.get('acknowledgementNote'),
    handoffGeofenceRadiusMeters: formData.get('handoffGeofenceRadiusMeters'),
    temporarilyAwayUntil: formData.get('temporarilyAwayUntil'),
    temporarilyAwayNote: formData.get('temporarilyAwayNote'),
    patientVersionId: formData.get('patientVersionId'),
    addressDetail: formData.get('addressDetail'),
    landmark: formData.get('landmark'),
    addressMapUrl: formData.get('addressMapUrl'),
    consentId: formData.get('consentId'),
    consentVersionId: formData.get('consentVersionId'),
    caregiverPhone: formData.get('caregiverPhone'),
    caregiverEmail: formData.get('caregiverEmail'),
    decision: formData.get('decision'),
    scopeProfile: formData.get('scopeProfile'),
    scopeVisits: formData.get('scopeVisits'),
    scopeVitals: formData.get('scopeVitals'),
    scopeNotes: formData.get('scopeNotes'),
    scopeTasks: formData.get('scopeTasks'),
  };
}
