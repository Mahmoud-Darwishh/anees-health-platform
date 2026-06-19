import 'server-only';
import { getMedplumPatient } from '@/lib/medplum/patients';
import { listPatientEncounters } from '@/lib/medplum/encounters';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import { getActivePatientCareTeam, listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { listPatientTasks } from '@/lib/medplum/tasks';
import { listPatientCaregiverPortalConsents } from '@/lib/medplum/consents';
import { listPatientConditions } from '@/lib/medplum/conditions';
import { listPatientAllergies } from '@/lib/medplum/allergies';
import { listPatientMedications } from '@/lib/medplum/medications';
import { listMedicationAdministrationRecords } from '@/lib/medplum/medication-administrations';
import { listPatientDocuments } from '@/lib/medplum/documents';
import { listPatientLabOrders, listPatientDiagnosticReports, listPatientLabResultObservations } from '@/lib/medplum/labs';
import { listPatientEpisodes } from '@/lib/medplum/episodes';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import { listGlucoseReadings } from '@/lib/medplum/glucose';
import { listPatientCommunications } from '@/lib/medplum/communications';
import { listPatientAppointments } from '@/lib/medplum/appointments';
import { listPatientCarePlans } from '@/lib/medplum/care-plans';
import { listPatientGoalsFromMedplum } from '@/lib/medplum/goals';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { CLINICAL_READ_ROLES, getStaffUser, isCaseScopedClinicalRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import type { AdminPatientDetailData } from '../types';
import { toCareTeamRole } from '../helpers';
import { type AdminWorkspaceTab, resolveCurrentWorkspaceTab } from '../workspace-tabs';
import { emptyAdminPatientDetailData } from './empty-state';
import { settledValue, settledError } from './settled';
import {
  deriveLocalVisitStateFallback,
  readLocalVisitState,
  readLocalVisitTimeline,
} from './local-visit-state';
import {
  canBypassRestrictedReason,
  getRestrictedAccessGrant,
  isRestrictedTierItem,
} from './restricted-access';

export async function loadAdminPatientDetailData(
  id: string,
  activeTab?: string,
): Promise<AdminPatientDetailData> {
  const user = await getStaffUser(CLINICAL_READ_ROLES);

  if (!user?.staffId || !user.staffRole) {
    return emptyAdminPatientDetailData({ staffRole: null, error: 'Unauthorized' });
  }

  // Tab-aware loading: resolve the active tab exactly as the view does, then load
  // only the datasets that tab renders (plus the always-needed core). Lazy datasets
  // here feed ONLY their own tab — never the safety header or restricted-access
  // banner — so an inactive tab can never hide clinical data or a restricted flag.
  const currentTab = resolveCurrentWorkspaceTab(user.staffRole, activeTab);
  const wants = (...tabs: AdminWorkspaceTab[]): boolean => tabs.includes(currentTab);

  let patient: Awaited<ReturnType<typeof getMedplumPatient>> | null = null;
  let error: string | null = null;

  try {
    patient = await getMedplumPatient(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load patient from Medplum';
  }

  if (patient?.id) {
    const tenantBridge = await prisma.patient.findFirst({
      where: {
        medplumPatientId: patient.id,
        tenantId: sessionTenantId(user),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!tenantBridge) {
      patient = null;
      error = 'Access denied: patient is outside your tenant.';
    }
  }

  if (patient?.id && isCaseScopedClinicalRole(user.staffRole)) {
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: user.staffId,
      name: user.name ?? user.email ?? `Staff ${user.staffId}`,
      email: user.email,
      role: user.staffRole,
    });
    const visiblePatientIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
    if (!visiblePatientIds.includes(patient.id)) {
      patient = null;
      error = 'Access denied: you are not assigned to this patient case.';
    }
  }

  if (!patient?.id) {
    return emptyAdminPatientDetailData({ staffRole: user.staffRole, error });
  }

  const localPatientPromise = prisma.patient.findFirst({
    where: { medplumPatientId: patient.id, tenantId: sessionTenantId(user) },
    select: {
      id: true,
      code: true,
      addressDetail: true,
      landmark: true,
      addressMapUrl: true,
      handoffGeofenceRadiusMeters: true,
      temporarilyAwayUntil: true,
      temporarilyAwayNote: true,
      primaryCaregiverPhone: true,
      primaryCaregiverEmail: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelation: true,
      dnrStatus: true,
    },
  });

  const localVisitsPromise = prisma.visit.findMany({
    where: {
      tenantId: sessionTenantId(user),
      patient: {
        medplumPatientId: patient.id,
        tenantId: sessionTenantId(user),
      },
    },
    orderBy: [{ scheduledDate: 'desc' }, { updatedAt: 'desc' }],
    take: 40,
    select: {
      id: true,
      code: true,
      status: true,
      scheduledDate: true,
      scheduledTime: true,
      acknowledgedAt: true,
      enRouteAt: true,
      arrivedAt: true,
      checkInAt: true,
      checkOutAt: true,
      checkInLat: true,
      checkInLng: true,
      checkOutLat: true,
      checkOutLng: true,
      checkInAccuracyM: true,
      provider: {
        select: {
          fullName: true,
        },
      },
    },
  });

  const standingOrdersPromise = wants('care-plan-goals')
    ? prisma.standingOrder.findMany({
        where: {
          patient: {
            medplumPatientId: patient.id,
            tenantId: sessionTenantId(user),
          },
        },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        take: 60,
        include: {
          executions: {
            orderBy: {
              executedAt: 'desc',
            },
            take: 1,
            select: {
              executedAt: true,
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
      })
    : Promise.resolve([]);

  const staffPromise = prisma.staff.findMany({
    where: {
      tenantId: sessionTenantId(user),
      status: 'active',
      role: {
        in: ['doctor', 'nurse', 'physiotherapist', 'medical_ops', 'operator', 'admin', 'superadmin', 'finance'],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  const [
    encountersResult,
    vitalsResult,
    clinicalNotesResult,
    careTeamResult,
    tasksResult,
    conditionsResult,
    allergiesResult,
    medicationsResult,
    medicationAdministrationsResult,
    documentsResult,
    labOrdersResult,
    labResultsResult,
    assessmentsResult,
    communicationsResult,
    appointmentsResult,
    carePlansResult,
    goalsResult,
    nurseShiftAssignmentsResult,
    localVisitsResult,
    standingOrdersResult,
    staffRows,
    consentsResult,
    localPatientResult,
    glucoseReadingsResult,
    labResultObservationsResult,
    episodesResult,
  ] =
    await Promise.allSettled([
      listPatientEncounters(patient.id, 30),
      listRecentPatientVitals(patient.id, 20),
      listPatientClinicalNotes(patient.id, 30),
      getActivePatientCareTeam(patient.id),
      listPatientTasks(patient.id, 40),
      listPatientConditions(patient.id, 80),
      listPatientAllergies(patient.id, 40),
      listPatientMedications(patient.id, 80),
      wants('medications-mar') ? listMedicationAdministrationRecords(patient.id, 120) : Promise.resolve([]),
      listPatientDocuments(patient.id, 40),
      listPatientLabOrders(patient.id, 30),
      listPatientDiagnosticReports(patient.id, 30),
      wants('measurements') ? listPatientAssessments(patient.id, 40) : Promise.resolve([]),
      wants('orders-tasks') ? listPatientCommunications(patient.id, 80) : Promise.resolve([]),
      wants('visits-encounters') ? listPatientAppointments(patient.id, 40) : Promise.resolve([]),
      wants('care-plan-goals') ? listPatientCarePlans(patient.id, 20) : Promise.resolve([]),
      wants('care-plan-goals') ? listPatientGoalsFromMedplum(patient.id, 50) : Promise.resolve([]),
      wants('orders-tasks')
        ? prisma.nurseShiftAssignment.findMany({
            where: {
              patient: {
                medplumPatientId: patient.id,
                tenantId: sessionTenantId(user),
              },
            },
            orderBy: {
              shiftStartAt: 'desc',
            },
            take: 50,
            select: {
              id: true,
              shiftStartAt: true,
              shiftEndAt: true,
              status: true,
              primaryNurseStaffId: true,
              incomingNurseStaffId: true,
              acknowledgedAt: true,
              escalationTaskId: true,
              notes: true,
              primaryNurse: {
                select: {
                  name: true,
                },
              },
              incomingNurse: {
                select: {
                  name: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      localVisitsPromise,
      standingOrdersPromise,
      staffPromise,
      wants('care-team-consent') ? listPatientCaregiverPortalConsents(patient.id) : Promise.resolve([]),
      localPatientPromise,
      wants('measurements') ? listGlucoseReadings(patient.id, 200, { daysBack: 120 }) : Promise.resolve([]),
      wants('labs') ? listPatientLabResultObservations(patient.id, 80) : Promise.resolve([]),
      wants('care-plan-goals') ? listPatientEpisodes(patient.id, 10) : Promise.resolve([]),
    ]);

  // Restricted-tier gating: computed from the always-loaded CORE datasets so the
  // safety banner and masking are independent of which tab is active.
  const baseConditions = settledValue(conditionsResult, []);
  const baseClinicalNotes = settledValue(clinicalNotesResult, []);
  const baseDocuments = settledValue(documentsResult, []);
  const baseLabOrders = settledValue(labOrdersResult, []);
  const baseLabResults = settledValue(labResultsResult, []);
  const restrictedInConditions = baseConditions.filter((item) =>
    isRestrictedTierItem({
      structuredFlag: item.restrictedTier,
      fallbackText: `${item.label} ${item.note ?? ''}`,
    }),
  );
  const restrictedInNotes = baseClinicalNotes.filter((item) =>
    isRestrictedTierItem({
      structuredFlag: item.restrictedTier,
      fallbackText: `${item.title} ${item.body ?? ''}`,
    }),
  );
  const restrictedInDocuments = baseDocuments.filter((item) =>
    isRestrictedTierItem({ structuredFlag: item.restrictedTier, fallbackText: `${item.title} ${item.category}` }),
  );
  const restrictedInLabOrders = baseLabOrders.filter((item) =>
    isRestrictedTierItem({ structuredFlag: item.restrictedTier, fallbackText: `${item.title} ${item.note ?? ''}` }),
  );
  const restrictedInLabResults = baseLabResults.filter((item) =>
    isRestrictedTierItem({ structuredFlag: item.restrictedTier, fallbackText: `${item.title} ${item.conclusion ?? ''}` }),
  );
  const hasRestrictedContent =
    restrictedInConditions.length > 0 ||
    restrictedInNotes.length > 0 ||
    restrictedInDocuments.length > 0 ||
    restrictedInLabOrders.length > 0 ||
    restrictedInLabResults.length > 0;

  const restrictedGrant =
    hasRestrictedContent && user.staffId
      ? await getRestrictedAccessGrant(patient.id, user.staffId)
      : null;
  const requiresReason =
    hasRestrictedContent &&
    !canBypassRestrictedReason(user.staffRole) &&
    !restrictedGrant;

  const visibleConditions = requiresReason
    ? baseConditions.filter(
        (item) =>
          !isRestrictedTierItem({
            structuredFlag: item.restrictedTier,
            fallbackText: `${item.label} ${item.note ?? ''}`,
          }),
      )
    : baseConditions;
  const visibleClinicalNotes = requiresReason
    ? baseClinicalNotes.filter(
        (item) =>
          !isRestrictedTierItem({
            structuredFlag: item.restrictedTier,
            fallbackText: `${item.title} ${item.body ?? ''}`,
          }),
      )
    : baseClinicalNotes;
  const visibleDocuments = requiresReason
    ? baseDocuments.filter(
        (item) => !isRestrictedTierItem({ structuredFlag: item.restrictedTier, fallbackText: `${item.title} ${item.category}` }),
      )
    : baseDocuments;
  const visibleLabOrders = requiresReason
    ? baseLabOrders.filter(
        (item) => !isRestrictedTierItem({ structuredFlag: item.restrictedTier, fallbackText: `${item.title} ${item.note ?? ''}` }),
      )
    : baseLabOrders;
  const visibleLabResults = requiresReason
    ? baseLabResults.filter(
        (item) =>
          !isRestrictedTierItem({ structuredFlag: item.restrictedTier, fallbackText: `${item.title} ${item.conclusion ?? ''}` }),
      )
    : baseLabResults;

  if (hasRestrictedContent && user.staffId) {
    try {
      await prisma.auditLog.create({
        data: {
          tableName: 'restricted_clinical_read',
          recordId: patient.id,
          action: requiresReason ? 'access_denied' : 'read',
          changedFields: {
            role: user.staffRole,
            reasonProvided: Boolean(restrictedGrant?.reason),
            maskedResources: {
              conditions: restrictedInConditions.length,
              notes: restrictedInNotes.length,
              documents: restrictedInDocuments.length,
              labOrders: restrictedInLabOrders.length,
              labResults: restrictedInLabResults.length,
            },
          },
          changedBy: user.staffId,
        },
      });
    } catch {
      // Best-effort audit.
    }
  }

  const resolvedLocalVisits =
    localVisitsResult.status === 'fulfilled'
      ? await Promise.all(
          localVisitsResult.value.map(async (visit) => {
            const effectiveState =
              (await readLocalVisitState(visit.id))
              ?? deriveLocalVisitStateFallback({
                status: visit.status,
                acknowledgedAt: visit.acknowledgedAt,
                enRouteAt: visit.enRouteAt,
                arrivedAt: visit.arrivedAt,
                checkInAt: visit.checkInAt,
                checkOutAt: visit.checkOutAt,
              });
            const transitionTimeline = await readLocalVisitTimeline(visit.id);

            return {
              id: visit.id,
              code: visit.code,
              status: visit.status,
              effectiveState,
              scheduledDate: visit.scheduledDate.toISOString(),
              scheduledTime: visit.scheduledTime ?? null,
              acknowledgedAt: visit.acknowledgedAt?.toISOString() ?? null,
              enRouteAt: visit.enRouteAt?.toISOString() ?? null,
              arrivedAt: visit.arrivedAt?.toISOString() ?? null,
              checkInAt: visit.checkInAt?.toISOString() ?? null,
              checkOutAt: visit.checkOutAt?.toISOString() ?? null,
              checkInLat: visit.checkInLat?.toString() ?? null,
              checkInLng: visit.checkInLng?.toString() ?? null,
              checkOutLat: visit.checkOutLat?.toString() ?? null,
              checkOutLng: visit.checkOutLng?.toString() ?? null,
              checkInAccuracyM: visit.checkInAccuracyM ?? null,
              providerName: visit.provider?.fullName ?? null,
              transitionTimeline,
            };
          }),
        )
      : [];

  return {
    staffRole: user.staffRole,
    restrictedAccess: {
      hasRestrictedContent,
      requiresReason,
      reasonPreview: restrictedGrant?.reason ?? null,
    },
    patient,
    localPatient:
      localPatientResult.status === 'fulfilled' && localPatientResult.value
        ? {
            ...localPatientResult.value,
            temporarilyAwayUntil: localPatientResult.value.temporarilyAwayUntil
              ? localPatientResult.value.temporarilyAwayUntil.toISOString()
              : null,
          }
        : null,
    error,
    encounters: settledValue(encountersResult, []),
    encountersError: settledError(encountersResult, 'Failed to load patient visits from Medplum'),
    vitals: settledValue(vitalsResult, []),
    vitalsError: settledError(vitalsResult, 'Failed to load patient vitals from Medplum'),
    clinicalNotes: visibleClinicalNotes,
    clinicalNotesError: settledError(clinicalNotesResult, 'Failed to load clinical notes from Medplum'),
    careTeam: settledValue(careTeamResult, null),
    careTeamError: settledError(careTeamResult, 'Failed to load care team from Medplum'),
    assignableStaff: settledValue(staffRows, []).filter((staff) => !!toCareTeamRole(staff.role)),
    tasks: settledValue(tasksResult, []),
    tasksError: settledError(tasksResult, 'Failed to load care tasks from Medplum'),
    conditions: visibleConditions,
    conditionsError: settledError(conditionsResult, 'Failed to load patient problems from Medplum'),
    allergies: settledValue(allergiesResult, []),
    allergiesError: settledError(allergiesResult, 'Failed to load patient allergies from Medplum'),
    medications: settledValue(medicationsResult, []),
    medicationsError: settledError(medicationsResult, 'Failed to load patient medications from Medplum'),
    medicationAdministrations: settledValue(medicationAdministrationsResult, []),
    medicationAdministrationsError: settledError(
      medicationAdministrationsResult,
      'Failed to load medication administration records from Medplum',
    ),
    documents: visibleDocuments,
    documentsError: settledError(documentsResult, 'Failed to load patient documents from Medplum'),
    labOrders: visibleLabOrders,
    labOrdersError: settledError(labOrdersResult, 'Failed to load lab orders from Medplum'),
    labResults: visibleLabResults,
    labResultsError: settledError(labResultsResult, 'Failed to load diagnostic reports from Medplum'),
    labResultObservations: settledValue(labResultObservationsResult, []),
    labResultObservationsError: settledError(labResultObservationsResult, 'Failed to load discrete lab results from Medplum'),
    episodes: settledValue(episodesResult, []),
    episodesError: settledError(episodesResult, 'Failed to load care episodes from Medplum'),
    assessments: settledValue(assessmentsResult, []),
    assessmentsError: settledError(assessmentsResult, 'Failed to load patient assessments from Medplum'),
    glucoseReadings: settledValue(glucoseReadingsResult, []),
    glucoseReadingsError: settledError(glucoseReadingsResult, 'Failed to load glucose readings from Medplum'),
    communications: settledValue(communicationsResult, []),
    communicationsError: settledError(communicationsResult, 'Failed to load clinical communications from Medplum'),
    appointments: settledValue(appointmentsResult, []),
    appointmentsError: settledError(appointmentsResult, 'Failed to load patient appointments from Medplum'),
    carePlans: settledValue(carePlansResult, []),
    carePlansError: settledError(carePlansResult, 'Failed to load patient care plans from Medplum'),
    goals: settledValue(goalsResult, []),
    goalsError: settledError(goalsResult, 'Failed to load patient goals from Medplum'),
    nurseShiftAssignments: settledValue(nurseShiftAssignmentsResult, []).map((assignment) => ({
      id: assignment.id,
      shiftStartAt: assignment.shiftStartAt.toISOString(),
      shiftEndAt: assignment.shiftEndAt.toISOString(),
      status: assignment.status,
      primaryNurseName: assignment.primaryNurse.name,
      primaryNurseStaffId: assignment.primaryNurseStaffId,
      incomingNurseName: assignment.incomingNurse?.name ?? null,
      incomingNurseStaffId: assignment.incomingNurseStaffId ?? null,
      acknowledgedAt: assignment.acknowledgedAt?.toISOString() ?? null,
      escalationTaskId: assignment.escalationTaskId ?? null,
      notes: assignment.notes ?? null,
    })),
    nurseShiftAssignmentsError: settledError(nurseShiftAssignmentsResult, 'Failed to load shift roster'),
    localVisits: resolvedLocalVisits,
    localVisitsError: settledError(localVisitsResult, 'Failed to load local visit workflow records'),
    standingOrders: settledValue(standingOrdersResult, []).map((order) => ({
      id: order.id,
      discipline: order.discipline,
      title: order.title,
      instructions: order.instructions,
      isActive: order.isActive,
      validFrom: order.validFrom?.toISOString() ?? null,
      validUntil: order.validUntil?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      createdByStaffId: order.createdByStaffId,
      lastExecutionAt: order.executions[0]?.executedAt?.toISOString() ?? null,
      executionCount: order._count.executions,
    })),
    standingOrdersError: settledError(standingOrdersResult, 'Failed to load standing orders'),
    caregiverConsents: settledValue(consentsResult, []),
    caregiverConsentsError: settledError(consentsResult, 'Failed to load caregiver consents from Medplum'),
  };
}
