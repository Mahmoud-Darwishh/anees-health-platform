import { z } from 'zod';
import { optionalTrimmedString, optionalDate, optionalNumber, optionalAccuracyMeters, requiredDate, requiredPatientId, requiredVisitId, visitDisruptionCode } from './primitives';

// Workflow timestamps are captured server-side at the moment the action runs
// ("when pressed"), so the client no longer submits them. They stay optional so
// a backfill/override caller can still pass an explicit instant.
// Coordinates are captured from the device GPS by the client; they're optional
// at the schema layer because a testing override may run without a fix — the
// server action enforces "coords required unless override" with a clear message.

// Latitude/longitude as optional numbers within valid bounds (null when absent).
const optionalLatitude = optionalNumber.refine(
  (value) => value === null || (value >= -90 && value <= 90),
  'Latitude must be between -90 and 90',
);
const optionalLongitude = optionalNumber.refine(
  (value) => value === null || (value >= -180 && value <= 180),
  'Longitude must be between -180 and 180',
);

export const acknowledgeVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  acknowledgedAt: optionalDate,
});

export const startTravelSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  enRouteAt: optionalDate,
});

export const markArrivedSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  arrivedAt: optionalDate,
});

export const checkInVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  checkInAt: optionalDate,
  checkInLatitude: optionalLatitude,
  checkInLongitude: optionalLongitude,
  checkInAccuracyMeters: optionalAccuracyMeters,
  geofenceOverrideMethod: z
    .preprocess((value) => {
      if (value == null) return undefined;
      const next = typeof value === 'string' ? value.trim() : value;
      return next === '' ? undefined : next;
    }, z.enum(['photo', 'code', 'med_ops']).optional()),
  geofenceOverrideReason: optionalTrimmedString,
  geofenceOverrideMediaId: optionalTrimmedString,
});

export const checkOutVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  visitId: requiredVisitId,
  checkOutAt: optionalDate,
  checkOutLatitude: optionalLatitude,
  checkOutLongitude: optionalLongitude,
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

