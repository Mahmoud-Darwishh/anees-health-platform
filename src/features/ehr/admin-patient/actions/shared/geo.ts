import 'server-only';

import type { StaffRole } from '@prisma/client';
import { evaluatePatientGeoPresence } from '@/lib/geo/presence-policy';
import { prisma } from '@/lib/db/prisma';
import { VISIT_GEOFENCE_DEFAULT_RADIUS_METERS, VISIT_GEOFENCE_MAX_ACCURACY_METERS } from './constants';

export type LocalPatientGeoPolicy = {
  localPatientId: string;
  handoffGeofenceRadiusMeters: number | null;
  temporarilyAwayUntil: Date | null;
  temporarilyAwayNote: string | null;
};

export async function getLocalPatientGeoPolicy(medplumPatientId: string): Promise<LocalPatientGeoPolicy | null> {
  const localPatient = await prisma.patient.findUnique({
    where: { medplumPatientId },
    select: {
      id: true,
      handoffGeofenceRadiusMeters: true,
      temporarilyAwayUntil: true,
      temporarilyAwayNote: true,
    },
  });

  if (!localPatient) {
    return null;
  }

  return {
    localPatientId: localPatient.id,
    handoffGeofenceRadiusMeters: localPatient.handoffGeofenceRadiusMeters,
    temporarilyAwayUntil: localPatient.temporarilyAwayUntil,
    temporarilyAwayNote: localPatient.temporarilyAwayNote,
  };
}

export function haversineDistanceMeters(params: {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}): number {
  const r = 6371000;
  const dLat = ((params.lat2 - params.lat1) * Math.PI) / 180;
  const dLng = ((params.lng2 - params.lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos((params.lat1 * Math.PI) / 180)
    * Math.cos((params.lat2 * Math.PI) / 180)
    * Math.sin(dLng / 2)
    * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

export async function evaluateVisitGeofence(params: {
  medplumPatientId: string;
  role: StaffRole | null | undefined;
  purpose: 'checkin' | 'checkout';
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}) {
  const policy = await getLocalPatientGeoPolicy(params.medplumPatientId);
  const maxDistanceMeters = policy?.handoffGeofenceRadiusMeters ?? VISIT_GEOFENCE_DEFAULT_RADIUS_METERS;

  const purpose = params.purpose === 'checkout'
    ? 'visit-checkout'
    : (params.role === 'physiotherapist' ? 'physio-visit-checkin' : 'doctor-visit-checkin');

  const evaluation = await evaluatePatientGeoPresence({
    patientId: params.medplumPatientId,
    purpose,
    currentLocation: {
      latitude: params.latitude,
      longitude: params.longitude,
    },
    accuracyMeters: params.accuracyMeters,
    policy: {
      maxDistanceMeters,
      maxAccuracyMeters: VISIT_GEOFENCE_MAX_ACCURACY_METERS,
    },
  });

  return evaluation;
}
