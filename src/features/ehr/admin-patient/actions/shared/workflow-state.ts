import 'server-only';

import { VisitState, VisitStatus } from '@prisma/client';
import type { DisruptionCode } from '@/lib/billing/cancellation-policy';
import { prisma } from '@/lib/db/prisma';

export type WorkflowStateValue =
  | 'scheduled'
  | 'acknowledged'
  | 'declined_by_physio'
  | 'cancelled_by_patient'
  | 'cancelled_by_med_ops'
  | 'reassigned_to_other_physio'
  | 'en_route'
  | 'diverted_in_transit'
  | 'arrived'
  | 'refused_at_door'
  | 'patient_not_home'
  | 'checked_in'
  | 'session_interrupted'
  | 'rescheduled_in_place'
  | 'checked_out'
  | 'disputed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const VISIT_STATE_VALUES = new Set<string>(Object.values(VisitState));

/**
 * Narrow a workflow-state label to a persistable `VisitState` enum value.
 * Legacy-only labels ('cancelled', 'no_show') have no enum member and resolve
 * to null, which the nullable `fromState` column accepts. Used so state writes
 * fail loudly on a genuinely-unknown value instead of being silently dropped.
 */
function asVisitState(value: WorkflowStateValue | null | undefined): VisitState | null {
  return value && VISIT_STATE_VALUES.has(value) ? (value as VisitState) : null;
}

export async function getWorkflowVisitOrThrow(params: {
  visitId: string;
  medplumPatientId: string;
}) {
  const visit = await prisma.visit.findUnique({
    where: { id: params.visitId },
    select: {
      id: true,
      code: true,
      providerId: true,
      status: true,
      scheduledDate: true,
      scheduledTime: true,
      servicePriceEgp: true,
      discountEgp: true,
      netPriceEgp: true,
      providerPayoutEgp: true,
      acknowledgedAt: true,
      enRouteAt: true,
      arrivedAt: true,
      checkInAt: true,
      checkInLat: true,
      checkInLng: true,
      checkOutAt: true,
      patient: {
        select: {
          medplumPatientId: true,
        },
      },
    },
  });

  if (!visit) {
    throw new Error('Visit record not found.');
  }

  if (visit.patient.medplumPatientId !== params.medplumPatientId) {
    throw new Error('Visit does not belong to this patient.');
  }

  return visit;
}

export function deriveWorkflowStateFromLegacy(visit: {
  status: VisitStatus;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): WorkflowStateValue {
  if (visit.status === VisitStatus.cancelled) {
    return 'cancelled';
  }
  if (visit.status === VisitStatus.no_show) {
    return 'no_show';
  }
  if (visit.status === VisitStatus.completed) {
    return 'completed';
  }
  if (visit.checkOutAt) {
    return 'checked_out';
  }
  if (visit.checkInAt) {
    return 'checked_in';
  }
  if (visit.arrivedAt) {
    return 'arrived';
  }
  if (visit.enRouteAt) {
    return 'en_route';
  }
  if (visit.acknowledgedAt) {
    return 'acknowledged';
  }
  return 'scheduled';
}

export async function readCurrentWorkflowState(visit: {
  id: string;
  status: VisitStatus;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): Promise<WorkflowStateValue> {
  const row = await prisma.visit.findUnique({
    where: { id: visit.id },
    select: { state: true },
  });
  if (row?.state) {
    return row.state as unknown as WorkflowStateValue;
  }

  return deriveWorkflowStateFromLegacy(visit);
}

export async function persistWorkflowStateTransition(params: {
  visit: {
    id: string;
    status: VisitStatus;
    acknowledgedAt: Date | null;
    enRouteAt: Date | null;
    arrivedAt: Date | null;
    checkInAt: Date | null;
    checkOutAt: Date | null;
  };
  toState: WorkflowStateValue;
  changedBy: string;
  reasonCode?: DisruptionCode | null;
  reasonNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  isOverride?: boolean;
  overrideMethod?: string | null;
}): Promise<void> {
  const fromState = await readCurrentWorkflowState(params.visit);
  const toState = asVisitState(params.toState);
  if (!toState) {
    throw new Error(`Cannot persist unknown visit workflow state "${params.toState}".`);
  }

  // Update the visit's current state and append the immutable ledger row in a
  // single transaction so the state column and the transition history can never
  // diverge. Both writes must succeed — failures surface, never get swallowed.
  await prisma.$transaction([
    prisma.visit.update({
      where: { id: params.visit.id },
      data: { state: toState },
    }),
    prisma.visitStateTransition.create({
      data: {
        visitId: params.visit.id,
        fromState: asVisitState(fromState),
        toState,
        actorStaffId: params.changedBy,
        actorSystem: false,
        reasonCode: params.reasonCode ?? null,
        reasonNote: params.reasonNote ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        accuracyMeters: params.accuracyMeters ?? null,
        isOverride: Boolean(params.isOverride),
        overrideMethod: params.overrideMethod ?? null,
      },
    }),
  ]);
}

export function isClosedVisitStatus(status: VisitStatus): boolean {
  return status === VisitStatus.cancelled || status === VisitStatus.completed || status === VisitStatus.no_show;
}
