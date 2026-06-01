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
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { CLINICAL_ROLES, getStaffUser, isCaseScopedClinicalRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import type { AdminPatientDetailData } from './types';
import { toCareTeamRole } from './helpers';

export async function loadAdminPatientDetailData(id: string): Promise<AdminPatientDetailData> {
  const user = await getStaffUser(CLINICAL_ROLES);

  if (!user?.staffId || !user.staffRole) {
    return {
      staffRole: null,
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
      nurseShiftAssignments: [],
      nurseShiftAssignmentsError: null,
      caregiverConsents: [],
      caregiverConsentsError: null,
    };
  }

  let patient: Awaited<ReturnType<typeof getMedplumPatient>> | null = null;
  let error: string | null = null;

  try {
    patient = await getMedplumPatient(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load patient from Medplum';
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
      nurseShiftAssignments: [],
      nurseShiftAssignmentsError: null,
      caregiverConsents: [],
      caregiverConsentsError: null,
    };
  }

  const localPatientPromise = prisma.patient.findUnique({
    where: { medplumPatientId: patient.id },
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
    },
  });

  const staffPromise = prisma.staff.findMany({
    where: {
      status: 'active',
      role: {
        in: ['doctor', 'nurse', 'physiotherapist', 'operator', 'admin', 'superadmin'],
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
    nurseShiftAssignmentsResult,
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
      listPatientCareReports(patient.id, 80),
      listPatientConditions(patient.id, 80),
      listPatientAllergies(patient.id, 40),
      listPatientMedications(patient.id, 80),
      listMedicationAdministrationRecords(patient.id, 120),
      listPatientDocuments(patient.id, 40),
      listPatientLabOrders(patient.id, 30),
      listPatientDiagnosticReports(patient.id, 30),
      listPatientAssessments(patient.id, 40),
      listPatientCommunications(patient.id, 80),
      listPatientAppointments(patient.id, 40),
      prisma.nurseShiftAssignment.findMany({
        where: {
          patient: {
            medplumPatientId: patient.id,
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
      }),
      staffPromise,
      listPatientCaregiverPortalConsents(patient.id),
      localPatientPromise,
    ]);

  return {
    staffRole: user.staffRole,
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
    clinicalNotes: clinicalNotesResult.status === 'fulfilled' ? clinicalNotesResult.value : [],
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
    conditions: conditionsResult.status === 'fulfilled' ? conditionsResult.value : [],
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
    documents: documentsResult.status === 'fulfilled' ? documentsResult.value : [],
    documentsError:
      documentsResult.status === 'rejected'
        ? documentsResult.reason instanceof Error
          ? documentsResult.reason.message
          : 'Failed to load patient documents from Medplum'
        : null,
    labOrders: labOrdersResult.status === 'fulfilled' ? labOrdersResult.value : [],
    labOrdersError:
      labOrdersResult.status === 'rejected'
        ? labOrdersResult.reason instanceof Error
          ? labOrdersResult.reason.message
          : 'Failed to load lab orders from Medplum'
        : null,
    labResults: labResultsResult.status === 'fulfilled' ? labResultsResult.value : [],
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
    caregiverConsents: consentsResult.status === 'fulfilled' ? consentsResult.value : [],
    caregiverConsentsError:
      consentsResult.status === 'rejected'
        ? consentsResult.reason instanceof Error
          ? consentsResult.reason.message
          : 'Failed to load caregiver consents from Medplum'
        : null,
  };
}
