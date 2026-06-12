import { z } from 'zod';
import { optionalTrimmedString, optionalHttpsUrl, optionalNumber, optionalDate, requiredPatientId, optionalEmail } from './primitives';

export const updatePatientGeoPolicySchema = z.object({
  medplumPatientId: requiredPatientId,
  handoffGeofenceRadiusMeters: optionalNumber.refine(
    (value) => value === null || (value >= 50 && value <= 5000),
    'Geofence radius must be between 50 and 5000 meters.',
  ),
  temporarilyAwayUntil: optionalDate,
  temporarilyAwayNote: optionalTrimmedString,
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
  secondaryEmergencyContactName: optionalTrimmedString,
  secondaryEmergencyContactPhone: optionalTrimmedString,
  secondaryEmergencyContactRelation: optionalTrimmedString,
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

