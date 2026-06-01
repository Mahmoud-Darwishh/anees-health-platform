import 'server-only';

import { getMedplumPatient } from '@/lib/medplum/patients';
import { EgyptianExtensions } from '@/lib/medplum/fhir-extensions';
import { haversineDistanceMeters, parseCoordinatesFromMapUrl, type GeoPoint } from '@/lib/utils/geo';

export type GeoPresencePurpose = 'nursing-handoff' | 'doctor-visit-checkin' | 'physio-visit-checkin' | 'visit-checkout';

export type GeoPresencePolicy = {
  maxDistanceMeters: number;
  maxAccuracyMeters: number;
};

export type EvaluatePatientGeoPresenceInput = {
  patientId: string;
  currentLocation: GeoPoint;
  accuracyMeters?: number | null;
  purpose: GeoPresencePurpose;
  policy: GeoPresencePolicy;
};

export type GeoPresenceEvaluation = {
  purpose: GeoPresencePurpose;
  allowed: boolean;
  patientLocation: GeoPoint;
  currentLocation: GeoPoint;
  distanceMeters: number;
  accuracyMeters: number | null;
  maxDistanceMeters: number;
  maxAccuracyMeters: number;
  failureReason: string | null;
};

type MedplumPatientAddress = {
  use?: string;
  extension?: Array<{ url?: string; valueUrl?: string }>;
};

type MedplumPatientWithAddress = {
  address?: MedplumPatientAddress[];
};

function getPatientLocationCoordinates(patient: MedplumPatientWithAddress): GeoPoint | null {
  const homeAddress = patient.address?.find((address) => address.use === 'home') ?? patient.address?.[0];
  const mapUrl = homeAddress?.extension?.find((extension) => extension.url === EgyptianExtensions.addressMapUrl)?.valueUrl;

  if (!mapUrl) {
    return null;
  }

  return parseCoordinatesFromMapUrl(mapUrl);
}

function validateAccuracy(accuracyMeters: number | null | undefined, maxAccuracyMeters: number): string | null {
  if (accuracyMeters === null || accuracyMeters === undefined) {
    return 'Current location accuracy is missing.';
  }

  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
    return 'Current location accuracy is invalid.';
  }

  if (accuracyMeters > maxAccuracyMeters) {
    return `Location accuracy is too low (${Math.round(accuracyMeters)}m).`;
  }

  return null;
}

export async function evaluatePatientGeoPresence(
  input: EvaluatePatientGeoPresenceInput,
): Promise<GeoPresenceEvaluation> {
  const patient = (await getMedplumPatient(input.patientId)) as MedplumPatientWithAddress;
  const patientLocation = getPatientLocationCoordinates(patient);

  if (!patientLocation) {
    throw new Error('Patient location coordinates are missing. Save a map link with coordinates in patient residence first.');
  }

  const accuracyError = validateAccuracy(input.accuracyMeters, input.policy.maxAccuracyMeters);
  const distanceMeters = haversineDistanceMeters(input.currentLocation, patientLocation);

  if (accuracyError) {
    return {
      purpose: input.purpose,
      allowed: false,
      patientLocation,
      currentLocation: input.currentLocation,
      distanceMeters,
      accuracyMeters: input.accuracyMeters ?? null,
      maxDistanceMeters: input.policy.maxDistanceMeters,
      maxAccuracyMeters: input.policy.maxAccuracyMeters,
      failureReason: accuracyError,
    };
  }

  if (distanceMeters > input.policy.maxDistanceMeters) {
    return {
      purpose: input.purpose,
      allowed: false,
      patientLocation,
      currentLocation: input.currentLocation,
      distanceMeters,
      accuracyMeters: input.accuracyMeters ?? null,
      maxDistanceMeters: input.policy.maxDistanceMeters,
      maxAccuracyMeters: input.policy.maxAccuracyMeters,
      failureReason: `Distance is outside allowed radius (${Math.round(distanceMeters)}m > ${input.policy.maxDistanceMeters}m).`,
    };
  }

  return {
    purpose: input.purpose,
    allowed: true,
    patientLocation,
    currentLocation: input.currentLocation,
    distanceMeters,
    accuracyMeters: input.accuracyMeters ?? null,
    maxDistanceMeters: input.policy.maxDistanceMeters,
    maxAccuracyMeters: input.policy.maxAccuracyMeters,
    failureReason: null,
  };
}
