import { z } from 'zod';
import { optionalTrimmedString, requiredLatitude, requiredLongitude, optionalAccuracyMeters, requiredDate, requiredPatientId, requiredVisitId, visitDisruptionCode } from './primitives';

export const recordVisitSchema = z.object({
  medplumPatientId: requiredPatientId,
  status: z.enum(['planned', 'in-progress', 'completed', 'cancelled']),
  visitType: z.enum(['in_home', 'clinic', 'virtual']),
  startAt: requiredDate,
  notes: optionalTrimmedString,
});

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

