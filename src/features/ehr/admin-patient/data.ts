import 'server-only';
import { getMedplumPatient } from '@/lib/medplum/patients';
import { listPatientEncounters } from '@/lib/medplum/encounters';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import { getActivePatientCareTeam, listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { listPatientTasks } from '@/lib/medplum/tasks';
import { listPatientCareReports } from '@/lib/medplum/care-reports';
import { listPatientCaregiverPortalConsents } from '@/lib/medplum/consents';
import { listPatientConditions } from '@/lib/medplum/conditions';
import { listPatientAllergies } from '@/lib/medplum/allergies';
import { listPatientMedications } from '@/lib/medplum/medications';
import { listMedicationAdministrationRecords } from '@/lib/medplum/medication-administrations';
import { listPatientDocuments } from '@/lib/medplum/documents';
import { listPatientLabOrders, listPatientDiagnosticReports } from '@/lib/medplum/labs';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import { listPatientCommunications } from '@/lib/medplum/communications';
import { listPatientAppointments } from '@/lib/medplum/appointments';
import { listPatientCarePlans } from '@/lib/medplum/care-plans';
import { listPatientGoalsFromMedplum } from '@/lib/medplum/goals';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { CLINICAL_ROLES, getStaffUser, isCaseScopedClinicalRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import type { AdminPatientDetailData } from './types';
import { toCareTeamRole } from './helpers';
import { type AdminWorkspaceTab, resolveCurrentWorkspaceTab } from './workspace-tabs';

type RestrictedAccessCookiePayload = {
  patientId: string;
  reason: string;
  grantedAt: string;
};

function deriveLocalVisitStateFallback(visit: {
  status: string;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): string {
  if (visit.status === 'cancelled' || visit.status === 'no_show' || visit.status === 'completed') {
    return visit.status;
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

async function readLocalVisitState(visitId: string): Promise<string | null> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { state: true },
  });
  return visit?.state ?? null;
}

async function readLocalVisitTimeline(
  visitId: string,
): Promise<Array<{ toState: string; createdAt: string; isOverride: boolean; overrideMethod: string | null }>> {
  const rows = await prisma.visitStateTransition.findMany({
    where: { visitId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      toState: true,
      createdAt: true,
      isOverride: true,
      overrideMethod: true,
    },
  });

  return rows.map((row) => ({
    toState: row.toState,
    createdAt: row.createdAt.toISOString(),
    isOverride: row.isOverride,
    overrideMethod: row.overrideMethod,
  }));
}

function hasRestrictedSignal(text: string): boolean {
  const keywords = ['hiv', 'sti', 'mental', 'psychi', 'reproductive', 'domestic violence', 'substance'];
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isRestrictedTierItem(params: {
  structuredFlag?: boolean;
  fallbackText?: string;
}): boolean {
  if (params.structuredFlag) {
    return true;
  }
  return params.fallbackText ? hasRestrictedSignal(params.fallbackText) : false;
}

function canBypassRestrictedReason(role: AdminPatientDetailData['staffRole']): boolean {
  return role === 'compliance_officer' || role === 'superadmin';
}

async function getRestrictedAccessGrant(
  patientId: string,
  staffId: string,
): Promise<RestrictedAccessCookiePayload | null> {
  const token = await prisma.destructiveApprovalToken.findFirst({
    where: {
      medplumPatientId: patientId,
      actionType: {
        in: ['restricted_read', 'break_glass_restricted_read'],
      },
      status: 'consumed',
      consumedBy: staffId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      consumedAt: 'desc',
    },
    select: {
      payload: true,
      consumedAt: true,
    },
  });

  if (!token) {
    return null;
  }

  const payload = token.payload && typeof token.payload === 'object' && !Array.isArray(token.payload)
    ? token.payload as Record<string, unknown>
    : {};
  const reason = typeof payload.reason === 'string' ? payload.reason : null;
  if (!reason) {
    return null;
  }
  return {
    patientId,
    reason,
    grantedAt: token.consumedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function loadAdminPatientDetailData(
  id: string,
  activeTab?: string,
): Promise<AdminPatientDetailData> {
  const user = await getStaffUser(CLINICAL_ROLES);

  if (!user?.staffId || !user.staffRole) {
    return {
      staffRole: null,
      restrictedAccess: {
        hasRestrictedContent: false,
        requiresReason: false,
        reasonPreview: null,
      },
      patient: null,
      localPatient: null,
      error: 'Unauthorized',
      encounters: [],
      encountersError: null,
      vitals: [],
      vitalsError: null,
      clinicalNotes: [],
      clinicalNotesError: null,
      careTeam: null,
      careTeamError: null,
      assignableStaff: [],
      tasks: [],
      tasksError: null,
      careReports: [],
      careReportsError: null,
      conditions: [],
      conditionsError: null,
      allergies: [],
      allergiesError: null,
      medications: [],
      medicationsError: null,
      medicationAdministrations: [],
      medicationAdministrationsError: null,
      documents: [],
      documentsError: null,
      labOrders: [],
      labOrdersError: null,
      labResults: [],
      labResultsError: null,
      assessments: [],
      assessmentsError: null,
      communications: [],
      communicationsError: null,
      appointments: [],
      appointmentsError: null,
      carePlans: [],
      carePlansError: null,
      goals: [],
      goalsError: null,
      nurseShiftAssignments: [],
      nurseShiftAssignmentsError: null,
      localVisits: [],
      localVisitsError: null,
      standingOrders: [],
      standingOrdersError: null,
      caregiverConsents: [],
      caregiverConsentsError: null,
    };
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
    return {
      staffRole: user.staffRole,
      restrictedAccess: {
        hasRestrictedContent: false,
        requiresReason: false,
        reasonPreview: null,
      },
      patient: null,
      localPatient: null,
      error,
      encounters: [],
      encountersError: null,
      vitals: [],
      vitalsError: null,
      clinicalNotes: [],
      clinicalNotesError: null,
      careTeam: null,
      careTeamError: null,
      assignableStaff: [],
      tasks: [],
      tasksError: null,
      careReports: [],
      careReportsError: null,
      conditions: [],
      conditionsError: null,
      allergies: [],
      allergiesError: null,
      medications: [],
      medicationsError: null,
      medicationAdministrations: [],
      medicationAdministrationsError: null,
      documents: [],
      documentsError: null,
      labOrders: [],
      labOrdersError: null,
      labResults: [],
      labResultsError: null,
      assessments: [],
      assessmentsError: null,
      communications: [],
      communicationsError: null,
      appointments: [],
      appointmentsError: null,
      carePlans: [],
      carePlansError: null,
      goals: [],
      goalsError: null,
      nurseShiftAssignments: [],
      nurseShiftAssignmentsError: null,
      localVisits: [],
      localVisitsError: null,
      standingOrders: [],
      standingOrdersError: null,
      caregiverConsents: [],
      caregiverConsentsError: null,
    };
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
    careReportsResult,
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
  ] =
    await Promise.allSettled([
      listPatientEncounters(patient.id, 30),
      listRecentPatientVitals(patient.id, 20),
      listPatientClinicalNotes(patient.id, 30),
      getActivePatientCareTeam(patient.id),
      listPatientTasks(patient.id, 40),
      wants('notes-reports') ? listPatientCareReports(patient.id, 80) : Promise.resolve([]),
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
    ]);

  const baseConditions = conditionsResult.status === 'fulfilled' ? conditionsResult.value : [];
  const baseClinicalNotes = clinicalNotesResult.status === 'fulfilled' ? clinicalNotesResult.value : [];
  const baseDocuments = documentsResult.status === 'fulfilled' ? documentsResult.value : [];
  const baseLabOrders = labOrdersResult.status === 'fulfilled' ? labOrdersResult.value : [];
  const baseLabResults = labResultsResult.status === 'fulfilled' ? labResultsResult.value : [];
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
    encounters: encountersResult.status === 'fulfilled' ? encountersResult.value : [],
    encountersError:
      encountersResult.status === 'rejected'
        ? encountersResult.reason instanceof Error
          ? encountersResult.reason.message
          : 'Failed to load patient visits from Medplum'
        : null,
    vitals: vitalsResult.status === 'fulfilled' ? vitalsResult.value : [],
    vitalsError:
      vitalsResult.status === 'rejected'
        ? vitalsResult.reason instanceof Error
          ? vitalsResult.reason.message
          : 'Failed to load patient vitals from Medplum'
        : null,
    clinicalNotes: visibleClinicalNotes,
    clinicalNotesError:
      clinicalNotesResult.status === 'rejected'
        ? clinicalNotesResult.reason instanceof Error
          ? clinicalNotesResult.reason.message
          : 'Failed to load clinical notes from Medplum'
        : null,
    careTeam: careTeamResult.status === 'fulfilled' ? careTeamResult.value : null,
    careTeamError:
      careTeamResult.status === 'rejected'
        ? careTeamResult.reason instanceof Error
          ? careTeamResult.reason.message
          : 'Failed to load care team from Medplum'
        : null,
    assignableStaff:
      staffRows.status === 'fulfilled'
        ? staffRows.value.filter((staff) => !!toCareTeamRole(staff.role))
        : [],
    tasks: tasksResult.status === 'fulfilled' ? tasksResult.value : [],
    tasksError:
      tasksResult.status === 'rejected'
        ? tasksResult.reason instanceof Error
          ? tasksResult.reason.message
          : 'Failed to load care tasks from Medplum'
        : null,
    careReports: careReportsResult.status === 'fulfilled' ? careReportsResult.value : [],
    careReportsError:
      careReportsResult.status === 'rejected'
        ? careReportsResult.reason instanceof Error
          ? careReportsResult.reason.message
          : 'Failed to load care reports from Medplum'
        : null,
    conditions: visibleConditions,
    conditionsError:
      conditionsResult.status === 'rejected'
        ? conditionsResult.reason instanceof Error
          ? conditionsResult.reason.message
          : 'Failed to load patient problems from Medplum'
        : null,
    allergies: allergiesResult.status === 'fulfilled' ? allergiesResult.value : [],
    allergiesError:
      allergiesResult.status === 'rejected'
        ? allergiesResult.reason instanceof Error
          ? allergiesResult.reason.message
          : 'Failed to load patient allergies from Medplum'
        : null,
    medications: medicationsResult.status === 'fulfilled' ? medicationsResult.value : [],
    medicationsError:
      medicationsResult.status === 'rejected'
        ? medicationsResult.reason instanceof Error
          ? medicationsResult.reason.message
          : 'Failed to load patient medications from Medplum'
        : null,
    medicationAdministrations:
      medicationAdministrationsResult.status === 'fulfilled'
        ? medicationAdministrationsResult.value
        : [],
    medicationAdministrationsError:
      medicationAdministrationsResult.status === 'rejected'
        ? medicationAdministrationsResult.reason instanceof Error
          ? medicationAdministrationsResult.reason.message
          : 'Failed to load medication administration records from Medplum'
        : null,
    documents: visibleDocuments,
    documentsError:
      documentsResult.status === 'rejected'
        ? documentsResult.reason instanceof Error
          ? documentsResult.reason.message
          : 'Failed to load patient documents from Medplum'
        : null,
    labOrders: visibleLabOrders,
    labOrdersError:
      labOrdersResult.status === 'rejected'
        ? labOrdersResult.reason instanceof Error
          ? labOrdersResult.reason.message
          : 'Failed to load lab orders from Medplum'
        : null,
    labResults: visibleLabResults,
    labResultsError:
      labResultsResult.status === 'rejected'
        ? labResultsResult.reason instanceof Error
          ? labResultsResult.reason.message
          : 'Failed to load diagnostic reports from Medplum'
        : null,
    assessments: assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [],
    assessmentsError:
      assessmentsResult.status === 'rejected'
        ? assessmentsResult.reason instanceof Error
          ? assessmentsResult.reason.message
          : 'Failed to load patient assessments from Medplum'
        : null,
    communications: communicationsResult.status === 'fulfilled' ? communicationsResult.value : [],
    communicationsError:
      communicationsResult.status === 'rejected'
        ? communicationsResult.reason instanceof Error
          ? communicationsResult.reason.message
          : 'Failed to load clinical communications from Medplum'
        : null,
    appointments: appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : [],
    appointmentsError:
      appointmentsResult.status === 'rejected'
        ? appointmentsResult.reason instanceof Error
          ? appointmentsResult.reason.message
          : 'Failed to load patient appointments from Medplum'
        : null,
    carePlans: carePlansResult.status === 'fulfilled' ? carePlansResult.value : [],
    carePlansError:
      carePlansResult.status === 'rejected'
        ? carePlansResult.reason instanceof Error
          ? carePlansResult.reason.message
          : 'Failed to load patient care plans from Medplum'
        : null,
    goals: goalsResult.status === 'fulfilled' ? goalsResult.value : [],
    goalsError:
      goalsResult.status === 'rejected'
        ? goalsResult.reason instanceof Error
          ? goalsResult.reason.message
          : 'Failed to load patient goals from Medplum'
        : null,
    nurseShiftAssignments:
      nurseShiftAssignmentsResult.status === 'fulfilled'
        ? nurseShiftAssignmentsResult.value.map((assignment) => ({
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
          }))
        : [],
    nurseShiftAssignmentsError:
      nurseShiftAssignmentsResult.status === 'rejected'
        ? nurseShiftAssignmentsResult.reason instanceof Error
          ? nurseShiftAssignmentsResult.reason.message
          : 'Failed to load shift roster'
        : null,
    localVisits: resolvedLocalVisits,
    localVisitsError:
      localVisitsResult.status === 'rejected'
        ? localVisitsResult.reason instanceof Error
          ? localVisitsResult.reason.message
          : 'Failed to load local visit workflow records'
        : null,
    standingOrders:
      standingOrdersResult.status === 'fulfilled'
        ? standingOrdersResult.value.map((order) => ({
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
          }))
        : [],
    standingOrdersError:
      standingOrdersResult.status === 'rejected'
        ? standingOrdersResult.reason instanceof Error
          ? standingOrdersResult.reason.message
          : 'Failed to load standing orders'
        : null,
    caregiverConsents: consentsResult.status === 'fulfilled' ? consentsResult.value : [],
    caregiverConsentsError:
      consentsResult.status === 'rejected'
        ? consentsResult.reason instanceof Error
          ? consentsResult.reason.message
          : 'Failed to load caregiver consents from Medplum'
        : null,
  };
}
