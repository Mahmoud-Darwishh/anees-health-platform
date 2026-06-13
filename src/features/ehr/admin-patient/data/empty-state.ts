import type { AdminPatientDetailData } from '../types';

/**
 * Canonical "no data" shape for the admin patient detail view. Used for both the
 * unauthorized path (staffRole null) and the patient-not-found / access-denied
 * path (staffRole present, error set), which previously duplicated ~55 fields each.
 */
export function emptyAdminPatientDetailData(params: {
  staffRole: AdminPatientDetailData['staffRole'];
  error: string | null;
}): AdminPatientDetailData {
  return {
    staffRole: params.staffRole,
    restrictedAccess: {
      hasRestrictedContent: false,
      requiresReason: false,
      reasonPreview: null,
    },
    patient: null,
    localPatient: null,
    error: params.error,
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
