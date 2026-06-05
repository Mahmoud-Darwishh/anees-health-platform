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

const requiredVisitId = z.string().trim().min(1, 'Visit id is required');
const visitDisruptionCode = z.enum([
  'patient_late_cancel',
  'patient_no_show',
  'patient_refused_care',
  'patient_hospitalised',
  'patient_deceased',
  'family_blocked_access',
  'unsafe_environment',
  'physio_personal_emergency',
  'physio_vehicle_breakdown',
  'physio_traffic_blocked',
  'weather',
  'med_ops_reassignment',
  'equipment_failure',
  'internet_blackout',
  'other',
]);

export const acknowledgeVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  acknowledgedAt: requiredDate,
});

export const startTravelSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  enRouteAt: requiredDate,
});

export const markArrivedSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  arrivedAt: requiredDate,
});

export const checkInVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  checkInAt: requiredDate,
  checkInLatitude: requiredLatitude,
  checkInLongitude: requiredLongitude,
  checkInAccuracyMeters: optionalAccuracyMeters,
  geofenceOverrideMethod: z
    .preprocess((value) => {
      const next = typeof value === 'string' ? value.trim() : value;
      return next === '' ? undefined : next;
    }, z.enum(['photo', 'code', 'med_ops']).optional()),
  geofenceOverrideReason: optionalTrimmedString,
  geofenceOverrideMediaId: optionalTrimmedString,
});

export const checkOutVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  checkOutAt: requiredDate,
  checkOutLatitude: requiredLatitude,
  checkOutLongitude: requiredLongitude,
  checkOutAccuracyMeters: optionalAccuracyMeters,
});

export const cancelVisitByPatientSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: optionalTrimmedString,
});

export const cancelVisitByMedOpsSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: optionalTrimmedString,
});

export const declineVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: optionalTrimmedString,
});

export const reassignVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  reassignedProviderId: optionalTrimmedString,
  disruptionNote: optionalTrimmedString,
});

export const markRefusedAtDoorSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: z.string().trim().min(8, 'Attempt log is required (minimum 8 characters).'),
});

export const markPatientNotHomeSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: z.string().trim().min(8, 'Attempt log is required (minimum 8 characters).'),
});

export const divertVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: optionalTrimmedString,
});

export const interruptSessionSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: optionalTrimmedString,
});

export const rescheduleInPlaceSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  nextScheduledDate: requiredDate,
  nextScheduledTime: z.string().trim().min(1, 'Next scheduled time is required.'),
  disruptionNote: optionalTrimmedString,
});

export const disputeVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  eventAt: requiredDate,
  disruptionCode: visitDisruptionCode,
  disruptionNote: z.string().trim().min(10, 'Dispute note is required (minimum 10 characters).'),
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

export const createPhysioReportSchema = z
  .object({
    medplumPatientId: requiredPatientId,
    physioVisitId: optionalTrimmedString,
    encounterId: optionalTrimmedString,
    sessionTemplate: z.enum(['post_op_knee', 'stroke_rehab', 'low_back_pain', 'geriatric_mobility', 'custom']).default('custom'),
    sessionNumberLabel: optionalTrimmedString,
    subjectiveFunction: optionalTrimmedString,
    objectiveSummary: optionalTrimmedString,
    // Structured objective fields (typed, template-specific)
    postOpKneeFlexionDeg: optionalNumber,
    postOpKneeExtensionDeg: optionalNumber,
    postOpKneeEffusionGrade: z.enum(['0', '1', '2', '3']).optional(),
    postOpKneeGaitPhase: z.enum(['loading_response', 'mid_stance', 'terminal_stance', 'swing', 'antalgic']).optional(),
    strokeAshworthScore: optionalNumber,
    strokeBergScore: optionalNumber,
    strokeFunctionalReachCm: optionalNumber,
    lowBackSlrLeftDeg: optionalNumber,
    lowBackSlrRightDeg: optionalNumber,
    lowBackSchoberCm: optionalNumber,
    lowBackPainWithMovement: optionalBoolean,
    geriatricTugSeconds: optionalNumber,
    geriatricTinettiScore: optionalNumber,
    geriatricFallRiskClass: z.enum(['low', 'moderate', 'high']).optional(),
    noteBody: z.string().trim().min(1, 'Physiotherapy note body is required'),
    interventions: optionalTrimmedString,
    painBefore: optionalNumber,
    painAfter: optionalNumber,
    responseSummary: optionalTrimmedString,
    homePlan: optionalTrimmedString,
    nextSessionFocus: optionalTrimmedString,
    dischargeReadiness: z.enum(['not_yet', 'one_to_two_sessions', 'ready']).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.painBefore !== null && (input.painBefore < 0 || input.painBefore > 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['painBefore'],
        message: 'Pain before must be between 0 and 10.',
      });
    }

    if (input.painAfter !== null && (input.painAfter < 0 || input.painAfter > 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['painAfter'],
        message: 'Pain after must be between 0 and 10.',
      });
    }

    if (input.sessionTemplate === 'post_op_knee') {
      if (input.postOpKneeFlexionDeg === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['postOpKneeFlexionDeg'],
          message: 'Post-op knee template requires flexion in degrees.',
        });
      }
      if (input.postOpKneeExtensionDeg === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['postOpKneeExtensionDeg'],
          message: 'Post-op knee template requires extension in degrees.',
        });
      }
    }

    if (input.sessionTemplate === 'stroke_rehab') {
      if (input.strokeAshworthScore === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['strokeAshworthScore'],
          message: 'Stroke rehab template requires Ashworth score.',
        });
      }
      if (input.strokeBergScore === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['strokeBergScore'],
          message: 'Stroke rehab template requires Berg score.',
        });
      }
    }

    if (input.sessionTemplate === 'low_back_pain') {
      if (input.lowBackSlrLeftDeg === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lowBackSlrLeftDeg'],
          message: 'Low back template requires SLR left degree.',
        });
      }
      if (input.lowBackSlrRightDeg === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lowBackSlrRightDeg'],
          message: 'Low back template requires SLR right degree.',
        });
      }
      if (input.lowBackSchoberCm === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lowBackSchoberCm'],
          message: 'Low back template requires Schober score in cm.',
        });
      }
    }

    if (input.sessionTemplate === 'geriatric_mobility') {
      if (input.geriatricTugSeconds === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['geriatricTugSeconds'],
          message: 'Geriatric template requires TUG seconds.',
        });
      }
      if (input.geriatricTinettiScore === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['geriatricTinettiScore'],
          message: 'Geriatric template requires Tinetti score.',
        });
      }
      if (!input.geriatricFallRiskClass) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['geriatricFallRiskClass'],
          message: 'Geriatric template requires fall risk class.',
        });
      }
    }

    if (input.dischargeReadiness === 'ready' && !(input.homePlan ?? '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['homePlan'],
        message: 'Home plan is required when discharge readiness is marked ready.',
      });
    }
  });

export const createConditionSchema = z.object({
  medplumPatientId: requiredPatientId,
  conditionCategory: z.enum(['medical', 'physical_therapy']).default('medical'),
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

export const requestRestrictedAccessSchema = z.object({
  medplumPatientId: requiredPatientId,
  restrictedAccessReason: z.string().trim().min(12, 'Restricted-access reason must be at least 12 characters.'),
});

export const requestBreakGlassAccessSchema = z.object({
  medplumPatientId: requiredPatientId,
  breakGlassReason: z.string().trim().min(20, 'Break-glass reason must be at least 20 characters.'),
});

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

export const requestDocumentDeleteApprovalSchema = z.object({
  medplumPatientId: requiredPatientId,
  documentId: z.string().trim().min(1, 'Document id is required'),
  deleteApprovalReason: z.string().trim().min(8, 'Delete approval reason is required.'),
});

export const approveDestructiveTokenSchema = z.object({
  medplumPatientId: requiredPatientId,
  approvalTokenId: z.string().trim().min(1, 'Approval token id is required.'),
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
    visitId: formData.get('visitId'),
    acknowledgedAt: formData.get('acknowledgedAt'),
    enRouteAt: formData.get('enRouteAt'),
    arrivedAt: formData.get('arrivedAt'),
    checkInAt: formData.get('checkInAt'),
    checkInLatitude: formData.get('checkInLatitude'),
    checkInLongitude: formData.get('checkInLongitude'),
    checkInAccuracyMeters: formData.get('checkInAccuracyMeters'),
    geofenceOverrideMethod: formData.get('geofenceOverrideMethod'),
    geofenceOverrideReason: formData.get('geofenceOverrideReason'),
    geofenceOverrideMediaId: formData.get('geofenceOverrideMediaId'),
    checkOutAt: formData.get('checkOutAt'),
    checkOutLatitude: formData.get('checkOutLatitude'),
    checkOutLongitude: formData.get('checkOutLongitude'),
    checkOutAccuracyMeters: formData.get('checkOutAccuracyMeters'),
    eventAt: formData.get('eventAt'),
    disruptionCode: formData.get('disruptionCode'),
    disruptionNote: formData.get('disruptionNote'),
    reassignedProviderId: formData.get('reassignedProviderId'),
    nextScheduledDate: formData.get('nextScheduledDate'),
    nextScheduledTime: formData.get('nextScheduledTime'),
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
    noteDiscipline: formData.get('noteDiscipline'),
    noteBody: formData.get('noteBody'),
    compositionId: formData.get('compositionId'),
    noteVersionId: formData.get('noteVersionId'),
    sourceCompositionId: formData.get('sourceCompositionId'),
    amendmentTitle: formData.get('amendmentTitle'),
    amendmentBody: formData.get('amendmentBody'),
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
    physioVisitId: formData.get('physioVisitId'),
    sessionTemplate: formData.get('sessionTemplate'),
    sessionNumberLabel: formData.get('sessionNumberLabel'),
    subjectiveFunction: formData.get('subjectiveFunction'),
    objectiveSummary: formData.get('objectiveSummary'),
    postOpKneeFlexionDeg: formData.get('postOpKneeFlexionDeg'),
    postOpKneeExtensionDeg: formData.get('postOpKneeExtensionDeg'),
    postOpKneeEffusionGrade: formData.get('postOpKneeEffusionGrade'),
    postOpKneeGaitPhase: formData.get('postOpKneeGaitPhase'),
    strokeAshworthScore: formData.get('strokeAshworthScore'),
    strokeBergScore: formData.get('strokeBergScore'),
    strokeFunctionalReachCm: formData.get('strokeFunctionalReachCm'),
    lowBackSlrLeftDeg: formData.get('lowBackSlrLeftDeg'),
    lowBackSlrRightDeg: formData.get('lowBackSlrRightDeg'),
    lowBackSchoberCm: formData.get('lowBackSchoberCm'),
    lowBackPainWithMovement: formData.get('lowBackPainWithMovement'),
    geriatricTugSeconds: formData.get('geriatricTugSeconds'),
    geriatricTinettiScore: formData.get('geriatricTinettiScore'),
    geriatricFallRiskClass: formData.get('geriatricFallRiskClass'),
    interventions: formData.get('interventions'),
    painBefore: formData.get('painBefore'),
    painAfter: formData.get('painAfter'),
    responseSummary: formData.get('responseSummary'),
    homePlan: formData.get('homePlan'),
    nextSessionFocus: formData.get('nextSessionFocus'),
    dischargeReadiness: formData.get('dischargeReadiness'),
    conditionCategory: formData.get('conditionCategory'),
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
    approvalTokenId: formData.get('approvalTokenId'),
    deleteApprovalReason: formData.get('deleteApprovalReason'),
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
    acknowledgementNote: formData.get('acknowledgementNote'),
    handoffGeofenceRadiusMeters: formData.get('handoffGeofenceRadiusMeters'),
    temporarilyAwayUntil: formData.get('temporarilyAwayUntil'),
    temporarilyAwayNote: formData.get('temporarilyAwayNote'),
    restrictedAccessReason: formData.get('restrictedAccessReason'),
    breakGlassReason: formData.get('breakGlassReason'),
    standingOrderDiscipline: formData.get('standingOrderDiscipline'),
    standingOrderTitle: formData.get('standingOrderTitle'),
    standingOrderInstructions: formData.get('standingOrderInstructions'),
    standingOrderValidUntil: formData.get('standingOrderValidUntil'),
    standingOrderId: formData.get('standingOrderId'),
    executionVisitId: formData.get('executionVisitId'),
    executionRecordedAt: formData.get('executionRecordedAt'),
    executionNote: formData.get('executionNote'),
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
