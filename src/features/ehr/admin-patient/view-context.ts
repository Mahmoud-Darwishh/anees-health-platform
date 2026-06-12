import { ANEES_PATIENT_CODE_SYSTEM } from './constants';
import { canCreateNursingShiftHandoff, canEditDemographics, canWriteClinicalCondition, canWriteMedication, getWorkspaceTabsForRole } from './role-scope';
import { ADMIN_WORKSPACE_TAB_LIST, resolveAllowedWorkspaceTab } from './workspace-tabs';
import type { AdminWorkspaceTab } from './workspace-tabs';
import { getPatientHomeAddress, getAddressMapUrl } from './view-helpers';
import type { AdminPatientDetailData } from './types';

export function buildAdminPatientViewContext(data: AdminPatientDetailData, activeTab?: string) {
  const {
    staffRole,
    restrictedAccess,
    patient,
    localPatient,
    error,
    encounters,
    encountersError,
    vitals,
    vitalsError,
    clinicalNotes,
    clinicalNotesError,
    careTeam,
    careTeamError,
    assignableStaff,
    tasks,
    tasksError,
    careReports,
    careReportsError,
    conditions,
    conditionsError,
    allergies,
    allergiesError,
    medications,
    medicationsError,
    medicationAdministrations,
    medicationAdministrationsError,
    documents,
    documentsError,
    labOrders,
    labOrdersError,
    labResults,
    labResultsError,
    assessments,
    assessmentsError,
    communications,
    communicationsError,
    appointments,
    appointmentsError,
    carePlans,
    carePlansError,
    goals,
    goalsError,
    nurseShiftAssignments,
    nurseShiftAssignmentsError,
    localVisits,
    localVisitsError,
    standingOrders,
    standingOrdersError,
    caregiverConsents,
    caregiverConsentsError,
  } = data;

  const careTeamMembers = careTeam?.participant ?? [];
  const homeAddress = getPatientHomeAddress(patient);
  const homeAddressLine = homeAddress?.line?.[0] ?? localPatient?.addressDetail ?? null;
  const homeAddressLandmark = homeAddress?.line?.[1] ?? localPatient?.landmark ?? null;
  const homeAddressMapUrl = getAddressMapUrl(homeAddress) ?? localPatient?.addressMapUrl ?? null;
  const medplumPrimaryEmergencyContact = patient?.contact?.[0] ?? null;
  const medplumSecondaryEmergencyContact = patient?.contact?.[1] ?? null;
  const emergencyContactName = localPatient?.emergencyContactName ?? medplumPrimaryEmergencyContact?.name?.text ?? null;
  const emergencyContactPhone = localPatient?.emergencyContactPhone ?? medplumPrimaryEmergencyContact?.telecom?.find((telecom: { system?: string; value?: string }) => telecom.system === 'phone')?.value ?? null;
  const emergencyContactRelation = localPatient?.emergencyContactRelation ?? medplumPrimaryEmergencyContact?.relationship?.[0]?.text ?? null;
  const secondaryEmergencyContactName = medplumSecondaryEmergencyContact?.name?.text ?? null;
  const secondaryEmergencyContactPhone = medplumSecondaryEmergencyContact?.telecom?.find((telecom: { system?: string; value?: string }) => telecom.system === 'phone')?.value ?? null;
  const secondaryEmergencyContactRelation = medplumSecondaryEmergencyContact?.relationship?.[0]?.text ?? null;

  const code = patient?.identifier?.find(
    (i: { system?: string; value?: string }) => i.system === ANEES_PATIENT_CODE_SYSTEM,
  )?.value;
  const phone = patient?.telecom?.find(
    (t: { system?: string; value?: string }) => t.system === 'phone',
  )?.value;
  const allowedTabs = getWorkspaceTabsForRole(staffRole).filter((tab): tab is AdminWorkspaceTab =>
    ADMIN_WORKSPACE_TAB_LIST.some((candidate) => candidate.id === tab),
  );
  const currentTab = resolveAllowedWorkspaceTab(activeTab, allowedTabs);
  const editableDemographics = canEditDemographics(staffRole);
  const canWriteMedicalCondition = canWriteClinicalCondition(staffRole, 'medical');
  const canWritePhysioCondition = canWriteClinicalCondition(staffRole, 'physical_therapy');
  const clinicalConditionWrite = canWriteMedicalCondition || canWritePhysioCondition;
  const medicationWrite = canWriteMedication(staffRole);
  const nursingShiftHandoffWrite = canCreateNursingShiftHandoff(staffRole);
  const isTab = (...tabs: AdminWorkspaceTab[]): boolean => tabs.includes(currentTab);
  const escalationTasks = tasks.filter((task) => task.code?.coding?.[0]?.code === 'escalation');
  const openTaskCount = tasks.filter((task) => !['completed', 'cancelled', 'rejected'].includes(task.status)).length;
  const activeDiagnoses = conditions.slice(0, 3).map((condition) => condition.label);
  const activeMedications = medications.filter((medication) => medication.status === 'active');
  const activeMedicationCount = activeMedications.length;
  const localVisitTransitions = localVisits
    .flatMap((visit) =>
      visit.transitionTimeline.map((entry) => ({
        visitCode: visit.code,
        toState: entry.toState,
        createdAt: entry.createdAt,
        isOverride: entry.isOverride,
        overrideMethod: entry.overrideMethod,
      })),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const tabHref = (tab: AdminWorkspaceTab): string => {
    return `/admin/patients/${patient.id}?tab=${tab}`;
  };
  const sectionHref = (tab: AdminWorkspaceTab, sectionId: string): string => `${tabHref(tab)}#${sectionId}`;
  const latestVisit = localVisits[0] ?? null;
  const latestVitals = vitals[0] ?? null;
  const safetyHeaderLinks = {
    allergies: sectionHref('problems-risks', 'patient-allergies'),
    dnr: sectionHref('problems-risks', 'patient-problems'),
    problems: sectionHref('problems-risks', 'patient-problems'),
    medications: sectionHref('medications-mar', 'patient-medications'),
    visits: sectionHref('visits-encounters', 'patient-visits'),
    measurements: sectionHref('measurements', 'patient-vitals'),
    careTeam: sectionHref('care-team-consent', 'patient-care-team'),
    tasks: sectionHref('orders-tasks', 'patient-tasks'),
    restricted: allowedTabs.includes('activity-audit')
      ? sectionHref('activity-audit', 'patient-restricted-access')
      : sectionHref('snapshot', 'patient-safety-header'),
  };

  return {
    data,
    activeTab,
    staffRole,
    restrictedAccess,
    patient,
    localPatient,
    error,
    encounters,
    encountersError,
    vitals,
    vitalsError,
    clinicalNotes,
    clinicalNotesError,
    careTeam,
    careTeamError,
    assignableStaff,
    tasks,
    tasksError,
    careReports,
    careReportsError,
    conditions,
    conditionsError,
    allergies,
    allergiesError,
    medications,
    medicationsError,
    medicationAdministrations,
    medicationAdministrationsError,
    documents,
    documentsError,
    labOrders,
    labOrdersError,
    labResults,
    labResultsError,
    assessments,
    assessmentsError,
    communications,
    communicationsError,
    appointments,
    appointmentsError,
    carePlans,
    carePlansError,
    goals,
    goalsError,
    nurseShiftAssignments,
    nurseShiftAssignmentsError,
    localVisits,
    localVisitsError,
    standingOrders,
    standingOrdersError,
    caregiverConsents,
    caregiverConsentsError,
    careTeamMembers,
    homeAddress,
    homeAddressLine,
    homeAddressLandmark,
    homeAddressMapUrl,
    medplumPrimaryEmergencyContact,
    medplumSecondaryEmergencyContact,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
    secondaryEmergencyContactName,
    secondaryEmergencyContactPhone,
    secondaryEmergencyContactRelation,
    code,
    phone,
    allowedTabs,
    currentTab,
    editableDemographics,
    canWriteMedicalCondition,
    canWritePhysioCondition,
    clinicalConditionWrite,
    medicationWrite,
    nursingShiftHandoffWrite,
    isTab,
    escalationTasks,
    openTaskCount,
    activeDiagnoses,
    activeMedications,
    activeMedicationCount,
    localVisitTransitions,
    tabHref,
    sectionHref,
    latestVisit,
    latestVitals,
    safetyHeaderLinks,
  };
}

export type AdminPatientViewContext = ReturnType<typeof buildAdminPatientViewContext>;
