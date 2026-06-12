import { z } from 'zod';
import { optionalTrimmedString, optionalNumber, requiredLatitude, requiredLongitude, optionalAccuracyMeters, optionalBoolean, requiredDate, requiredPatientId } from './primitives';

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

