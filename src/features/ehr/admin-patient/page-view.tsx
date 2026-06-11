import Link from 'next/link';
import type { AdminPatientDetailData, AdminPatientFlash } from './types';
import { ANEES_PATIENT_CODE_SYSTEM } from './constants';
import {
  appointmentTypeLabel,
  encounterStatusLabel,
  encounterVisitType,
  reportCode,
  reportComponentText,
  Row,
  taskDueDate,
  taskPriorityLabel,
  taskStatusLabel,
  taskTitle,
} from './helpers';
import {
  assignCareTeamMemberAction,
  createAllergyAction,
  createAssessmentAction,
  createAppointmentAction,
  createCareTaskAction,
  createClinicalNoteDraftAction,
  amendClinicalNoteAction,
  createCommunicationAction,
  createDiagnosticReportAction,
  createDocumentAction,
  deleteDocumentAction,
  createEscalationAction,
  createConditionAction,
  retireConditionAction,
  updateConditionStatusAction,
  createLabOrderAction,
  createMedicationAction,
  createMedicationAdministrationAction,
  updateMedicationStatusAction,
  retireMedicationAction,
  retireMedicationAdministrationAction,
  retireAllergyAction,
  updateAllergyStatusAction,
  acknowledgeVisitAction,
  startTravelAction,
  markArrivedAction,
  checkInVisitAction,
  checkOutVisitAction,
  requestRestrictedAccessAction,
  requestBreakGlassAccessAction,
  createStandingOrderAction,
  executeStandingOrderAction,
  createNursingReportAction,
  createNursingShiftHandoffAction,
  createNurseShiftAssignmentAction,
  acknowledgeIncomingNurseAction,
  createPhysioReportAction,
  createIncidentReportAction,
  recordVisitAction,
  recordVitalsAction,
  runEscalationSlaSweepAction,
  signClinicalNoteAction,
  updatePatientGeoPolicyAction,
  updatePatientDemographicsAction,
  upsertCaregiverConsentAction,
  unassignCareTeamMemberAction,
  updateCareTaskStatusAction,
} from './actions';
import {
  canCreateNursingShiftHandoff,
  canEditDemographics,
  canWriteClinicalCondition,
  canWriteMedication,
  getWorkspaceTabsForRole,
} from './role-scope';
import {
  type AdminWorkspaceTab,
  ADMIN_WORKSPACE_TAB_LIST,
  resolveAllowedWorkspaceTab,
} from './workspace-tabs';
import { NursingHandoffLocationCapture } from './NursingHandoffLocationCapture';
import { DocumentFileInput } from './DocumentFileInput';
import { PatientSafetyHeader } from './PatientSafetyHeader';
import { ProblemCodeFields } from '@/features/ehr/components/ProblemCodeFields';
import { TerminologyTextField } from '@/features/ehr/components/TerminologyTextField';
import { NowDateTimeInput } from '@/features/ehr/components/NowDateTimeInput';

const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024;

const CONDITION_CONTEXT_OPTIONS = [
  'New diagnosis during this episode',
  'Known chronic condition under routine follow-up',
  'Stable with current plan',
  'Worsening; escalation pathway activated',
  'Improving with current treatment and rehab plan',
] as const;

const CONDITION_STATUS_OPTIONS = ['active', 'resolved', 'inactive', 'remission'] as const;

const ALLERGY_STATUS_OPTIONS = ['active', 'inactive', 'resolved'] as const;

// Free-text allergens with a small convenience list of common ones (datalist).
const COMMON_ALLERGENS = [
  'Penicillin',
  'Amoxicillin',
  'Cephalosporins',
  'Sulfa drugs',
  'Aspirin',
  'NSAIDs',
  'Ibuprofen',
  'Codeine',
  'Morphine',
  'Contrast dye',
  'Latex',
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Eggs',
  'Milk',
  'Soy',
  'Wheat',
  'Bee stings',
  'Pollen',
  'Dust mites',
] as const;


const MEDICATION_ROUTE_OPTIONS = ['Oral', 'Sublingual', 'Subcutaneous', 'Intramuscular', 'Intravenous', 'Topical', 'Inhaled', 'Rectal', 'Ophthalmic', 'Otic'] as const;

const MEDICATION_MANAGE_STATUS_OPTIONS = ['active', 'on-hold', 'completed', 'stopped'] as const;

// Duration options auto-calculate the medication end date from the start date.
const MEDICATION_DURATION_OPTIONS = [
  { value: '', label: 'Ongoing (no end date)' },
  { value: '3', label: '3 days' },
  { value: '5', label: '5 days' },
  { value: '7', label: '7 days' },
  { value: '10', label: '10 days' },
  { value: '14', label: '14 days' },
  { value: '21', label: '21 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

// Free-text medication names with a convenience list of common ones (datalist).
const COMMON_MEDICATIONS = [
  'Paracetamol (Acetaminophen)',
  'Ibuprofen',
  'Aspirin',
  'Amoxicillin',
  'Amoxicillin/Clavulanate',
  'Azithromycin',
  'Ceftriaxone',
  'Ciprofloxacin',
  'Metronidazole',
  'Omeprazole',
  'Pantoprazole',
  'Metformin',
  'Insulin glargine',
  'Insulin regular',
  'Amlodipine',
  'Lisinopril',
  'Losartan',
  'Bisoprolol',
  'Atorvastatin',
  'Furosemide',
  'Spironolactone',
  'Warfarin',
  'Enoxaparin',
  'Clopidogrel',
  'Levothyroxine',
  'Prednisolone',
  'Salbutamol (Albuterol)',
  'Ondansetron',
  'Morphine',
  'Tramadol',
  'Diazepam',
  'Ceftazidime',
  'Vancomycin',
  'Heparin',
] as const;

const MEDICATION_FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every morning',
  'Every evening',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
] as const;


const MAR_REASON_OPTIONS = [
  'Patient refused',
  'Patient asleep',
  'Held by clinician order',
  'Medication unavailable',
  'Nausea/vomiting',
  'Blood pressure outside parameters',
  'Blood glucose outside parameters',
  'Dose already taken',
  'Route not safe',
  'Other clinical reason',
] as const;


const ASSESSMENT_OPTIONS = [
  { title: 'Falls risk screen', type: 'mobility', summary: 'Falls risk reviewed; prevention plan updated.' },
  { title: 'Braden pressure injury risk', type: 'functional', summary: 'Skin risk reviewed; repositioning and skin-care plan updated.' },
  { title: 'Pain reassessment', type: 'pain', summary: 'Pain score reviewed with response to current plan.' },
  { title: 'Mobility and gait review', type: 'mobility', summary: 'Mobility reviewed with transfer and gait safety recommendations.' },
  { title: 'ADL functional review', type: 'functional', summary: 'ADL support level reviewed and care plan updated.' },
  { title: 'Cognitive status screen', type: 'functional', summary: 'Cognitive status reviewed; safety supervision needs updated.' },
  { title: 'Wound risk review', type: 'other', summary: 'Wound status/risk reviewed and follow-up plan updated.' },
] as const;

const NURSING_STATUS_OPTIONS = [
  'Stable; no acute change this shift',
  'Improving compared with prior shift',
  'Requires close monitoring',
  'New symptom reported',
  'Deterioration suspected',
  'Post-procedure monitoring',
] as const;

const PENDING_TASK_OPTIONS = [
  'No pending clinical tasks',
  'Medication administration due next shift',
  'Vitals monitoring due next shift',
  'Wound care/dressing due next shift',
  'Family update pending',
  'Lab or imaging follow-up pending',
  'Escalation follow-up pending',
] as const;

const MEDICATION_SAFETY_OPTIONS = [
  'No medication safety issues this shift',
  'MAR complete for this shift',
  'Medication refused/held; see MAR',
  'Medication supply issue',
  'High-alert medication requires double-check',
  'Adverse reaction monitoring required',
] as const;

const NEXT_SHIFT_FOCUS_OPTIONS = [
  'Routine monitoring',
  'Vitals trend and escalation watch',
  'Medication adherence and MAR completion',
  'Skin integrity and repositioning',
  'Mobility/falls prevention',
  'Nutrition and hydration',
  'Family education and reassurance',
] as const;

const TASK_TITLE_OPTIONS = [
  'Lab follow-up',
  'Medication reconciliation',
  'Family update',
  'Care plan review',
  'Wound care follow-up',
  'Vitals trend review',
  'Insurance/prior authorization follow-up',
  'Hospital handoff preparation',
] as const;

const TASK_DESCRIPTION_OPTIONS = [
  'Confirm completion and document outcome.',
  'Call family and document response.',
  'Review with supervising clinician.',
  'Coordinate next visit requirement.',
  'Escalate if not completed before due date.',
] as const;

const INCIDENT_ACTION_OPTIONS = [
  'Patient assessed and stabilized',
  'Vitals checked',
  'Family notified',
  'Physician/medical ops notified',
  'Environment made safe',
  'Medication held pending review',
  'Escalation task created',
] as const;

const VISIT_NOTE_OPTIONS = [
  'Routine home visit',
  'Medication review performed',
  'Vitals and safety review performed',
  'Wound care visit',
  'Physiotherapy session',
  'Post-discharge follow-up',
  'Family education provided',
] as const;

const COMMUNICATION_MESSAGE_OPTIONS = [
  'Clinical update documented; no action required.',
  'Family update requested.',
  'Medication concern requires review.',
  'Vitals trend requires review.',
  'Visit schedule requires coordination.',
  'Care plan review requested.',
  'Hospital handoff coordination required.',
] as const;

const ESCALATION_TITLE_OPTIONS = [
  'Respiratory deterioration',
  'Abnormal vital signs',
  'Medication safety issue',
  'Fall or injury concern',
  'Pressure injury concern',
  'Family escalation',
  'Missed visit or access issue',
  'Hospital transfer consideration',
] as const;

const ESCALATION_SUMMARY_OPTIONS = [
  'Requires urgent clinician review and documented next action.',
  'Requires medical ops follow-up before next scheduled visit.',
  'Requires family contact and safety-plan confirmation.',
  'Requires medication review before next dose.',
  'Requires hospital-partner coordination.',
] as const;

const APPOINTMENT_NOTE_OPTIONS = [
  'Routine scheduled visit',
  'Medication administration visit',
  'Vitals monitoring visit',
  'Wound care visit',
  'Physiotherapy session',
  'Post-discharge follow-up',
  'Family teaching visit',
] as const;

const TEMPORARILY_AWAY_OPTIONS = [
  'Patient is temporarily staying with family',
  'Patient is hospitalized temporarily',
  'Patient is traveling temporarily',
  'Temporary address pending confirmation',
] as const;

// Workspace-tab definitions + resolution live in ./workspace-tabs (shared with the loader).

function getPatientHomeAddress(patient: AdminPatientDetailData['patient']) {
  return patient?.address?.find((address: { use?: string }) => address.use === 'home') ?? patient?.address?.[0] ?? null;
}

function getAddressMapUrl(address: ReturnType<typeof getPatientHomeAddress>): string | null {
  return (
    address?.extension?.find((extension: { url: string; valueUrl?: string }) => extension.url === 'https://anees.health/fhir/StructureDefinition/address-map-url')
      ?.valueUrl ?? null
  );
}

function communicationCategoryLabel(category: string): string {
  switch (category) {
    case 'clinical-update':
      return 'Clinical update';
    case 'handoff':
      return 'Handoff';
    case 'escalation':
      return 'Escalation';
    case 'incident':
      return 'Incident';
    default:
      return category;
  }
}

function appointmentStatusLabel(status: string): string {
  switch (status) {
    case 'booked':
      return 'Booked';
    case 'fulfilled':
      return 'Fulfilled';
    case 'cancelled':
      return 'Cancelled';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

function workflowStateLabel(state: string): string {
  return state
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatClinicalDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString('en-GB');
}

function carePlanStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'text-bg-success';
    case 'on-hold':
      return 'text-bg-warning';
    case 'completed':
      return 'text-bg-primary';
    case 'revoked':
    case 'entered-in-error':
      return 'text-bg-danger';
    default:
      return 'text-bg-secondary';
  }
}

function goalStatusBadgeClass(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'text-bg-success';
    case 'met':
      return 'text-bg-primary';
    case 'discontinued':
      return 'text-bg-secondary';
    default:
      return 'text-bg-light text-dark';
  }
}

function goalStatusLabel(status: string): string {
  return workflowStateLabel(status);
}

export function AdminPatientDetailView({
  data,
  flash,
  activeTab,
}: {
  data: AdminPatientDetailData;
  flash: AdminPatientFlash | null;
  activeTab?: string;
}) {
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

  return (
    <div>
      <div className="anees-banner anees-banner-head mb-3 d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-1 small opacity-75">Anees EHR · Patient Workspace</p>
          <h1 className="h5 mb-0">{patient?.name?.[0]?.text ?? 'Patient profile'}</h1>
          <p className="small mb-0 mt-1 text-muted">Unified workspace for structured documentation, care coordination, and clinical continuity.</p>
        </div>
        <span className="anees-chip">Case-scoped access active</span>
      </div>

      {flash && (
        <div className={`alert ${flash.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {flash.message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          Could not load patient: {error}
        </div>
      )}

      {patient && (
        <div className="d-grid gap-3">
          <div className="card bg-white">
            <div className="card-body py-2 anees-tab-card-body">
              <div className="anees-tab-nav-wrap">
                <div className="anees-tab-nav" role="tablist" aria-label="Patient workspace navigation">
                  {ADMIN_WORKSPACE_TAB_LIST.filter((tab) => allowedTabs.includes(tab.id)).map((tab) => {
                    const isActive = currentTab === tab.id;

                    return (
                      <Link
                        key={tab.id}
                        href={tabHref(tab.id)}
                        className={`anees-tab-link ${isActive ? 'is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <PatientSafetyHeader
            patientName={patient?.name?.[0]?.text ?? 'Patient profile'}
            patientCode={code ?? localPatient?.code ?? null}
            patientGender={patient.gender}
            patientBirthDate={patient.birthDate}
            dnrStatus={localPatient?.dnrStatus ?? null}
            restrictedAccess={restrictedAccess}
            allergies={allergies}
            activeDiagnoses={activeDiagnoses}
            activeMedicationCount={activeMedicationCount}
            careTeamCount={careTeamMembers.length}
            openTaskCount={openTaskCount}
            latestVisit={latestVisit}
            latestVitals={latestVitals}
            links={safetyHeaderLinks}
          >
              {restrictedAccess.hasRestrictedContent && restrictedAccess.requiresReason && (
                <form action={requestRestrictedAccessAction} className="row g-2 border-top pt-3 mt-1">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <div className="col-md-10">
                    <label htmlFor="restrictedAccessReason" className="form-label mb-1">Restricted-tier access reason (required)</label>
                    <textarea
                      id="restrictedAccessReason"
                      name="restrictedAccessReason"
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="State the clinical justification for restricted data access"
                      required
                      dir="auto"
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="submit" className="btn btn-sm btn-outline-dark w-100">Request access</button>
                  </div>
                </form>
              )}

              {restrictedAccess.hasRestrictedContent && restrictedAccess.requiresReason && (
                <form action={requestBreakGlassAccessAction} className="row g-2 mt-1">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <div className="col-md-10">
                    <label htmlFor="breakGlassReason" className="form-label mb-1">Emergency break-glass reason</label>
                    <textarea
                      id="breakGlassReason"
                      name="breakGlassReason"
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Emergency-only access justification (audited and escalated)"
                      required
                      dir="auto"
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="submit" className="btn btn-sm btn-outline-danger w-100">Break glass</button>
                  </div>
                </form>
              )}

              {restrictedAccess.hasRestrictedContent && !restrictedAccess.requiresReason && restrictedAccess.reasonPreview && (
                <div className="small text-muted border-top pt-2 mt-1">
                  Restricted access active for this session. Reason: {restrictedAccess.reasonPreview}
                </div>
              )}
          </PatientSafetyHeader>

          {isTab('snapshot') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0 d-flex align-items-center gap-2">
                Patient summary
                {careTeamMembers.length > 0 && <span className="anees-chip">{careTeamMembers.length} care team members</span>}
              </h2>
            </div>
            <div className="card-body">
              <Row label="Patient name" value={patient?.name?.[0]?.text ?? 'Patient profile'} />
              <Row label="Medplum ID" value={patient.id} />
              <Row label="Patient code" value={code} />
              <Row label="Phone" value={phone} />
              <Row label="Gender" value={patient.gender} />
              <Row label="Birth date" value={patient.birthDate} />
              <Row label="Active" value={patient.active ? 'Yes' : 'No'} />
            </div>
          </div>
          )}

          {isTab('activity-audit') && (
          <div id="patient-restricted-access" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Visit transition timeline</h2>
              <span className="text-muted small">State-first workflow telemetry</span>
            </div>
            <div className="card-body">
              {localVisitsError && <div className="alert alert-warning" role="alert">Could not load workflow visits: {localVisitsError}</div>}
              {!localVisitsError && localVisitTransitions.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">No transition events recorded yet.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {localVisitTransitions.map((entry, index) => (
                    <li key={`${entry.visitCode}-${entry.toState}-${entry.createdAt}-${index}`} className="list-group-item px-0">
                      <div className="fw-semibold">{entry.visitCode} · {workflowStateLabel(entry.toState)}</div>
                      <div className="small text-muted">
                        {new Date(entry.createdAt).toLocaleString('en-GB')}
                        {entry.isOverride ? ` · override (${entry.overrideMethod ?? 'manual'})` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          )}

          {isTab('snapshot') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Patient residence</h2>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <Row label="Address detail" value={homeAddressLine} />
                <Row label="Landmark" value={homeAddressLandmark} />
                <Row
                  label="Location link"
                  value={
                    homeAddressMapUrl ? (
                      <a href={homeAddressMapUrl} target="_blank" rel="noreferrer">
                        Open map
                      </a>
                    ) : '—'
                  }
                />
              </div>

              {editableDemographics ? (
                <details className="mt-3">
                  <summary className="fw-semibold">Edit residence</summary>
                  <form action={updatePatientDemographicsAction} className="row g-3 mt-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <input type="hidden" name="patientVersionId" value={patient.meta?.versionId ?? ''} />
                    <input type="hidden" name="demographicSection" value="residence" />
                    <input type="hidden" name="emergencyContactName" value={emergencyContactName ?? ''} />
                    <input type="hidden" name="emergencyContactPhone" value={emergencyContactPhone ?? ''} />
                    <input type="hidden" name="emergencyContactRelation" value={emergencyContactRelation ?? ''} />

                    <div className="col-md-6">
                      <label htmlFor="address-detail" className="form-label">Address detail</label>
                      <textarea
                        id="address-detail"
                        name="addressDetail"
                        className="form-control"
                        rows={3}
                        defaultValue={homeAddressLine ?? ''}
                        placeholder="Building, street, floor, apartment"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="address-landmark" className="form-label">Landmark</label>
                      <input
                        id="address-landmark"
                        name="landmark"
                        type="text"
                        className="form-control"
                        defaultValue={homeAddressLandmark ?? ''}
                        placeholder="Nearest landmark or delivery note"
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="address-map-url" className="form-label">Location link</label>
                      <input
                        id="address-map-url"
                        name="addressMapUrl"
                        type="url"
                        inputMode="url"
                        className="form-control"
                        defaultValue={homeAddressMapUrl ?? ''}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>

                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Save residence</button>
                    </div>
                  </form>
                </details>
              ) : (
                <div className="alert alert-info mb-0" role="alert">Residence details are read-only for your role.</div>
              )}
            </div>
          </div>
          )}

          {isTab('snapshot') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Emergency contact</h2>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <Row label="Name" value={emergencyContactName} />
                <Row label="Phone" value={emergencyContactPhone} />
                <Row label="Relationship" value={emergencyContactRelation} />
                <Row label="Secondary contact" value={secondaryEmergencyContactName} />
                <Row label="Secondary phone" value={secondaryEmergencyContactPhone} />
                <Row label="Secondary relation" value={secondaryEmergencyContactRelation} />
              </div>

              {editableDemographics ? (
                <details className="mt-3">
                  <summary className="fw-semibold">Edit emergency contacts</summary>
                  <form action={updatePatientDemographicsAction} className="row g-3 mt-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <input type="hidden" name="patientVersionId" value={patient.meta?.versionId ?? ''} />
                    <input type="hidden" name="demographicSection" value="emergency" />
                    <input type="hidden" name="addressDetail" value={homeAddressLine ?? ''} />
                    <input type="hidden" name="landmark" value={homeAddressLandmark ?? ''} />
                    <input type="hidden" name="addressMapUrl" value={homeAddressMapUrl ?? ''} />

                    <div className="col-12">
                      <h3 className="h6 mb-0">Primary contact</h3>
                    </div>

                    <div className="col-md-12">
                      <label htmlFor="emergency-contact-name" className="form-label">Emergency contact name</label>
                      <input
                        id="emergency-contact-name"
                        name="emergencyContactName"
                        type="text"
                        className="form-control"
                        defaultValue={emergencyContactName ?? ''}
                        placeholder="Parent, spouse, or guardian"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="emergency-contact-phone" className="form-label">Emergency contact phone</label>
                      <input
                        id="emergency-contact-phone"
                        name="emergencyContactPhone"
                        type="text"
                        className="form-control"
                        defaultValue={emergencyContactPhone ?? ''}
                        placeholder="+20..."
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="emergency-contact-relation" className="form-label">Emergency contact relation</label>
                      <input
                        id="emergency-contact-relation"
                        name="emergencyContactRelation"
                        type="text"
                        className="form-control"
                        defaultValue={emergencyContactRelation ?? ''}
                        placeholder="Mother, father, spouse, sibling"
                      />
                    </div>

                    <div className="col-12 mt-2">
                      <h3 className="h6 mb-0">Secondary contact</h3>
                      <p className="text-muted small mb-0">Optional backup contact for escalation and handoffs.</p>
                    </div>

                    <div className="col-md-12">
                      <label htmlFor="secondary-emergency-contact-name" className="form-label">Secondary contact name</label>
                      <input
                        id="secondary-emergency-contact-name"
                        name="secondaryEmergencyContactName"
                        type="text"
                        className="form-control"
                        defaultValue={secondaryEmergencyContactName ?? ''}
                        placeholder="Backup family contact"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="secondary-emergency-contact-phone" className="form-label">Secondary contact phone</label>
                      <input
                        id="secondary-emergency-contact-phone"
                        name="secondaryEmergencyContactPhone"
                        type="text"
                        className="form-control"
                        defaultValue={secondaryEmergencyContactPhone ?? ''}
                        placeholder="+20..."
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="secondary-emergency-contact-relation" className="form-label">Secondary contact relation</label>
                      <input
                        id="secondary-emergency-contact-relation"
                        name="secondaryEmergencyContactRelation"
                        type="text"
                        className="form-control"
                        defaultValue={secondaryEmergencyContactRelation ?? ''}
                        placeholder="Son, daughter, sibling, friend"
                      />
                    </div>

                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Save emergency contacts</button>
                    </div>
                  </form>
                </details>
              ) : (
                <div className="alert alert-info mb-0" role="alert">Emergency contact details are read-only for your role.</div>
              )}
            </div>
          </div>
          )}

          {isTab('problems-risks') && (
          <div id="patient-problems" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Problem list</h2>
              <span className="text-muted small">{conditions.length} records</span>
            </div>
            <div className="card-body">
              {clinicalConditionWrite ? (
              <form action={createConditionAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="conditionCategory" className="form-label">Category</label>
                  <select id="conditionCategory" name="conditionCategory" className="form-select" defaultValue={canWriteMedicalCondition ? 'medical' : 'physical_therapy'}>
                    {canWriteMedicalCondition ? <option value="medical">Medical diagnosis</option> : null}
                    {canWritePhysioCondition ? <option value="physical_therapy">PT diagnosis</option> : null}
                  </select>
                </div>
                <ProblemCodeFields problemInputName="conditionLabel" codeInputName="conditionCode" />
                <div className="col-md-2">
                  <label htmlFor="conditionOnsetDate" className="form-label">Onset</label>
                  <input id="conditionOnsetDate" name="conditionOnsetDate" type="date" className="form-control" />
                </div>
                <div className="col-md-6">
                  <label htmlFor="conditionNote" className="form-label">Clinical context</label>
                  <select id="conditionNote" name="conditionNote" className="form-select" defaultValue="">
                    <option value="">Not specified</option>
                    {CONDITION_CONTEXT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Add problem</button>
                </div>
              </form>
              ) : (
                <div className="alert alert-info">Diagnosis authoring is role-scoped. You still have read access.</div>
              )}
              {conditionsError && <div className="alert alert-warning" role="alert">Could not load problems: {conditionsError}</div>}
              {!conditionsError && conditions.length === 0 && <div className="alert alert-info mb-0" role="alert">No problems recorded yet.</div>}
              {!conditionsError && conditions.length > 0 && (
                <div className="table-responsive anees-documents-table-wrap">
                  <table className="table table-sm align-middle mb-0 anees-documents-table">
                    <thead><tr><th>Problem</th><th>Type</th><th>Status</th><th>Onset</th><th>Notes</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {conditions.map((condition) => (
                        <tr key={condition.id}>
                          <td>
                            <div className="fw-semibold">{condition.label}</div>
                            <div className="text-muted small">{condition.code ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`badge ${condition.category === 'physical_therapy' ? 'bg-info-subtle text-info-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                              {condition.category === 'physical_therapy' ? 'PT' : 'Medical'}
                            </span>
                          </td>
                          <td className="text-capitalize">{condition.status}</td>
                          <td>{condition.onset ? new Date(condition.onset).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="text-muted small">{condition.note ?? '—'}</td>
                          <td className="text-end">
                            {clinicalConditionWrite ? (
                              <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                                <form action={updateConditionStatusAction} className="d-inline-flex gap-1 align-items-center">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="conditionId" value={condition.id} />
                                  <label className="visually-hidden" htmlFor={`conditionStatus-${condition.id}`}>Update status</label>
                                  <select
                                    id={`conditionStatus-${condition.id}`}
                                    name="conditionStatus"
                                    className="form-select form-select-sm w-auto"
                                    defaultValue={(CONDITION_STATUS_OPTIONS as readonly string[]).includes(condition.statusCode) ? condition.statusCode : 'active'}
                                  >
                                    {CONDITION_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status} className="text-capitalize">{status}</option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn btn-sm btn-outline-secondary">Update</button>
                                </form>
                                <form action={retireConditionAction} className="d-inline">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="conditionId" value={condition.id} />
                                  <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                                </form>
                              </div>
                            ) : (
                              <span className="text-muted small">Read only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('problems-risks') && (
          <div id="patient-allergies" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Allergies</h2>
              <span className="text-muted small">{allergies.length} records</span>
            </div>
            <div className="card-body">
              <form action={createAllergyAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-6">
                  <label htmlFor="allergen" className="form-label">Allergen</label>
                  <input
                    id="allergen"
                    name="allergen"
                    type="text"
                    className="form-control"
                    placeholder="Type allergen (free text)"
                    list="common-allergens"
                    autoComplete="off"
                    required
                  />
                  <datalist id="common-allergens">
                    {COMMON_ALLERGENS.map((allergen) => (
                      <option key={allergen} value={allergen} />
                    ))}
                  </datalist>
                </div>
                <div className="col-md-6">
                  <label htmlFor="allergySeverity" className="form-label">Severity</label>
                  <select id="allergySeverity" name="allergySeverity" className="form-select" defaultValue="">
                    <option value="">Unknown</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="allergyNote" className="form-label">Notes</label>
                  <input
                    id="allergyNote"
                    name="allergyNote"
                    type="text"
                    className="form-control"
                    placeholder="Type allergy note (free text)"
                    autoComplete="off"
                  />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Add allergy</button>
                </div>
              </form>
              {allergiesError && <div className="alert alert-warning" role="alert">Could not load allergies: {allergiesError}</div>}
              {!allergiesError && allergies.length === 0 && <div className="alert alert-info mb-0" role="alert">No allergies recorded yet.</div>}
              {!allergiesError && allergies.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Allergen</th><th>Severity</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {allergies.map((allergy) => (
                        <tr key={allergy.id}>
                          <td>
                            <div className="fw-semibold">{allergy.allergen}</div>
                            {allergy.note ? <div className="text-muted small">{allergy.note}</div> : null}
                          </td>
                          <td className="text-capitalize">{allergy.severity ?? '—'}</td>
                          <td className="text-capitalize">{allergy.status}</td>
                          <td className="text-end">
                            <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                              <form action={updateAllergyStatusAction} className="d-inline-flex gap-1 align-items-center">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="allergyId" value={allergy.id} />
                                <label className="visually-hidden" htmlFor={`allergyStatus-${allergy.id}`}>Update status</label>
                                <select
                                  id={`allergyStatus-${allergy.id}`}
                                  name="allergyStatus"
                                  className="form-select form-select-sm w-auto"
                                  defaultValue={(ALLERGY_STATUS_OPTIONS as readonly string[]).includes(allergy.statusCode) ? allergy.statusCode : 'active'}
                                >
                                  {ALLERGY_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status} className="text-capitalize">{status}</option>
                                  ))}
                                </select>
                                <button type="submit" className="btn btn-sm btn-outline-secondary">Update</button>
                              </form>
                              <form action={retireAllergyAction} className="d-inline">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="allergyId" value={allergy.id} />
                                <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('medications-mar') && (
          <div id="patient-medications" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Medications</h2>
              <span className="text-muted small">{medications.length} records</span>
            </div>
            <div className="card-body">
              {medicationWrite ? (
                <details className="mb-3">
                  <summary className="fw-semibold">Add medication order</summary>
                  <form action={createMedicationAction} className="row g-3 mt-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-md-6">
                      <label htmlFor="medicationName" className="form-label">Medication name</label>
                      <input
                        id="medicationName"
                        name="medicationName"
                        type="text"
                        className="form-control"
                        placeholder="Type medication (free text)"
                        list="common-medications"
                        autoComplete="off"
                        required
                      />
                      <datalist id="common-medications">
                        {COMMON_MEDICATIONS.map((medication) => (
                          <option key={medication} value={medication} />
                        ))}
                      </datalist>
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="startDate" className="form-label">Start date</label>
                      <input id="startDate" name="startDate" type="date" className="form-control" />
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="medicationDurationDays" className="form-label">Duration</label>
                      <select id="medicationDurationDays" name="medicationDurationDays" className="form-select" defaultValue="">
                        {MEDICATION_DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="form-text">End date is calculated from the start date.</div>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="dosageText" className="form-label">Dosage</label>
                      <input id="dosageText" name="dosageText" className="form-control" placeholder="5 mg once daily" />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="routeText" className="form-label">Route</label>
                      <select id="routeText" name="routeText" className="form-select" defaultValue="">
                        <option value="">Not specified</option>
                        {MEDICATION_ROUTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="frequencyText" className="form-label">Frequency</label>
                      <select id="frequencyText" name="frequencyText" className="form-select" defaultValue="">
                        <option value="">Not specified</option>
                        {MEDICATION_FREQUENCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="medicationNote" className="form-label">Notes</label>
                      <textarea id="medicationNote" name="medicationNote" className="form-control" rows={2} placeholder="Medication context or monitoring notes" dir="auto" />
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Add medication</button>
                    </div>
                  </form>
                </details>
              ) : (
                <div className="alert alert-info">Medication authoring is limited to doctors, admins, and super admins. You still have read access.</div>
              )}
              {medicationsError && <div className="alert alert-warning" role="alert">Could not load medications: {medicationsError}</div>}
              {!medicationsError && medications.length === 0 && <div className="alert alert-info mb-0" role="alert">No medications recorded yet.</div>}
              {!medicationsError && medications.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Medication</th><th>Status</th><th>Dosage</th><th>Start / End</th>{medicationWrite && <th className="text-end">Actions</th>}</tr></thead>
                    <tbody>
                      {medications.map((medication) => (
                        <tr key={medication.id}>
                          <td>
                            <div className="fw-semibold">{medication.medication}</div>
                            <div className="text-muted small">{medication.note ?? '—'}</div>
                          </td>
                          <td className="text-capitalize">{medication.status}</td>
                          <td>
                            <div>{medication.dosage ?? '—'}</div>
                            <div className="text-muted small">{medication.route ?? '—'} {medication.frequency ? `· ${medication.frequency}` : ''}</div>
                          </td>
                          <td className="text-muted small">{medication.start ? new Date(medication.start).toLocaleDateString('en-GB') : '—'} {medication.end ? `→ ${new Date(medication.end).toLocaleDateString('en-GB')}` : ''}</td>
                          {medicationWrite && (
                            <td className="text-end">
                              <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                                <form action={updateMedicationStatusAction} className="d-inline-flex gap-1 align-items-center">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="medicationId" value={medication.id} />
                                  <label className="visually-hidden" htmlFor={`medicationStatus-${medication.id}`}>Update status</label>
                                  <select
                                    id={`medicationStatus-${medication.id}`}
                                    name="medicationManageStatus"
                                    className="form-select form-select-sm w-auto text-capitalize"
                                    defaultValue={(MEDICATION_MANAGE_STATUS_OPTIONS as readonly string[]).includes(medication.status) ? medication.status : 'active'}
                                  >
                                    {MEDICATION_MANAGE_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status} className="text-capitalize">{status}</option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn btn-sm btn-outline-secondary">Update</button>
                                </form>
                                <form action={retireMedicationAction} className="d-inline">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="medicationId" value={medication.id} />
                                  <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                                </form>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('medications-mar') && (
          <div id="patient-mar" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Medication Administration Record (MAR)</h2>
              <span className="text-muted small">{medicationAdministrations.length} entries</span>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="h6 mb-0">Quick MAR checklist</h3>
                  <span className="text-muted small">{activeMedications.length} active medications</span>
                </div>
                <p className="text-muted small">Time defaults to now and can be edited if a dose was given earlier or recorded late.</p>
                {activeMedications.length === 0 ? (
                  <div className="alert alert-info mb-0" role="alert">No active medications are available for checklist MAR. Add or activate medications first.</div>
                ) : (
                  <div className="list-group">
                    {activeMedications.map((medication) => (
                      <form key={medication.id} action={createMedicationAdministrationAction} className="list-group-item">
                        <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                        <input type="hidden" name="medicationStatementId" value={medication.id} />
                        <input type="hidden" name="medicationName" value={medication.medication} />
                        <div className="row g-2 align-items-end">
                          <div className="col-lg-5">
                            <div className="fw-semibold">{medication.medication}</div>
                            <div className="small text-muted">
                              {medication.dosage ?? 'Dose not specified'}
                              {medication.route ? ` / ${medication.route}` : ''}
                              {medication.frequency ? ` / ${medication.frequency}` : ''}
                            </div>
                          </div>
                          <div className="col-sm-4 col-lg-2">
                            <label htmlFor={`mar-check-status-${medication.id}`} className="form-label">Outcome</label>
                            <select id={`mar-check-status-${medication.id}`} name="administrationStatus" className="form-select form-select-sm" defaultValue="given">
                              <option value="given">Given</option>
                              <option value="refused">Refused</option>
                              <option value="held">Held</option>
                            </select>
                          </div>
                          <div className="col-sm-5 col-lg-3">
                            <label htmlFor={`mar-check-time-${medication.id}`} className="form-label">Date &amp; time</label>
                            <NowDateTimeInput id={`mar-check-time-${medication.id}`} name="administeredAt" className="form-control form-control-sm" />
                          </div>
                          <div className="col-sm-3 col-lg-2 d-grid">
                            <label className="form-label d-none d-lg-block">&nbsp;</label>
                            <button type="submit" className="btn btn-sm btn-primary">Save</button>
                          </div>
                        </div>
                      </form>
                    ))}
                  </div>
                )}
              </div>

              <details className="mb-3">
                <summary className="fw-semibold">Ad hoc / PRN dose (not in the list above)</summary>
              <form action={createMedicationAdministrationAction} className="row g-3 mb-3 mt-1">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-12">
                  <p className="text-muted small mb-0">For as-needed (PRN) or one-off medications that are not on the active list above.</p>
                </div>
                <div className="col-md-5">
                  <label htmlFor="mar-medication-name" className="form-label">Medication name</label>
                  <input
                    id="mar-medication-name"
                    name="medicationName"
                    type="text"
                    className="form-control"
                    placeholder="Type medication (free text)"
                    list="common-medications"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="mar-status" className="form-label">Outcome</label>
                  <select id="mar-status" name="administrationStatus" className="form-select" defaultValue="given">
                    <option value="given">Given</option>
                    <option value="refused">Refused</option>
                    <option value="held">Held</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="mar-administered-at" className="form-label">Date &amp; time</label>
                  <NowDateTimeInput id="mar-administered-at" name="administeredAt" className="form-control" />
                  <div className="form-text">Defaults to now; edit if recording a past dose.</div>
                </div>
                <div className="col-md-6">
                  <label htmlFor="mar-reason" className="form-label">Reason (if refused/held)</label>
                  <select id="mar-reason" name="administrationReason" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {MAR_REASON_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="mar-note" className="form-label">Notes</label>
                  <input id="mar-note" name="administrationNote" className="form-control" placeholder="Optional" dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Save MAR entry</button>
                </div>
              </form>
              </details>

              {medicationAdministrationsError && <div className="alert alert-warning" role="alert">Could not load MAR records: {medicationAdministrationsError}</div>}
              {!medicationAdministrationsError && medicationAdministrations.length === 0 && <div className="alert alert-info mb-0" role="alert">No MAR records yet.</div>}
              {!medicationAdministrationsError && medicationAdministrations.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Medication</th><th>Outcome</th><th>Administered</th><th>Recorded by</th><th>Reason/Note</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {medicationAdministrations.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.medication}</td>
                          <td className="text-capitalize">{entry.status}</td>
                          <td>{entry.administeredAt ? new Date(entry.administeredAt).toLocaleString('en-GB') : '—'}</td>
                          <td>{entry.recordedBy ?? '—'}</td>
                          <td className="text-muted small">{entry.reason ?? entry.note ?? '—'}</td>
                          <td className="text-end">
                            <form action={retireMedicationAdministrationAction} className="d-inline">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="administrationId" value={entry.id} />
                              <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('documents') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Documents and files</h2>
              <span className="text-muted small">{documents.length} records</span>
            </div>
            <div className="card-body">
              <form action={createDocumentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-5">
                  <label htmlFor="documentTitle" className="form-label">Document title</label>
                  <input id="documentTitle" name="documentTitle" className="form-control" placeholder="MRI report" required />
                </div>
                <div className="col-md-3">
                  <label htmlFor="documentCategory" className="form-label">Category</label>
                  <select id="documentCategory" name="documentCategory" className="form-select" defaultValue="report">
                    <option value="report">Report</option>
                    <option value="lab">Lab</option>
                    <option value="imaging">Imaging</option>
                    <option value="insurance">Insurance</option>
                    <option value="consent">Consent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="documentFile" className="form-label">File</label>
                  <DocumentFileInput
                    id="documentFile"
                    name="documentFile"
                    className="form-control"
                    maxBytes={MAX_DOCUMENT_UPLOAD_BYTES}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="documentDate" className="form-label">Document date</label>
                  <input id="documentDate" name="documentDate" type="date" className="form-control" />
                </div>
                <div className="col-12">
                  <label htmlFor="documentNote" className="form-label">Notes</label>
                  <textarea id="documentNote" name="documentNote" className="form-control" rows={2} placeholder="What this file contains or why it matters" dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Upload document</button>
                </div>
              </form>

              {documentsError && <div className="alert alert-warning" role="alert">Could not load documents: {documentsError}</div>}
              {!documentsError && documents.length === 0 && <div className="alert alert-info mb-0" role="alert">No documents uploaded yet.</div>}
              {!documentsError && documents.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 anees-documents-table">
                    <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Date</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {documents.map((document) => (
                        <tr key={document.id} className="anees-doc-row">
                          <td className="anees-doc-col-title" data-label="Title">
                            <div className="fw-semibold">{document.title}</div>
                            <div className="text-muted small">{document.author ?? '—'}</div>
                          </td>
                          <td className="text-capitalize anees-doc-col-category" data-label="Category">{document.category}</td>
                          <td className="text-muted small anees-doc-col-type" data-label="Type">{document.contentType ?? '—'}</td>
                          <td className="anees-doc-col-date" data-label="Date">{document.createdAt ? new Date(document.createdAt).toLocaleString('en-GB') : '—'}</td>
                          <td className="text-end anees-doc-actions" data-label="Actions">
                            <div className="d-inline-flex gap-2 anees-doc-actions-wrap">
                              <a className="btn btn-sm btn-outline-secondary" href={`/api/ehr/documents/${document.id}?disposition=inline`} target="_blank" rel="noopener noreferrer">View</a>
                              <a className="btn btn-sm btn-outline-primary" href={`/api/ehr/documents/${document.id}`}>Download</a>
                              <form action={deleteDocumentAction} className="d-inline d-flex gap-1">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="documentId" value={document.id} />
                                <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('labs') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Labs and imaging</h2>
              <span className="text-muted small">{labOrders.length} orders · {labResults.length} results</span>
            </div>
            <div className="card-body">
              <div className="row g-4 mb-3">
                <div className="col-lg-6">
                  <h3 className="h6">New order</h3>
                  <form action={createLabOrderAction} className="row g-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-md-6">
                      <TerminologyTextField
                        domain="lab-order"
                        name="labOrderTitle"
                        label="Order title"
                        placeholder="Type lab or imaging order"
                        required
                      />
                    </div>
                    <div className="col-md-3"><label htmlFor="labOrderCategory" className="form-label">Category</label><select id="labOrderCategory" name="labOrderCategory" className="form-select" defaultValue="lab"><option value="lab">Lab</option><option value="imaging">Imaging</option><option value="other">Other</option></select></div>
                    <div className="col-md-3"><label htmlFor="labOrderDate" className="form-label">Requested on</label><input id="labOrderDate" name="labOrderDate" type="date" className="form-control" /></div>
                    <div className="col-md-6"><label htmlFor="labOrderCode" className="form-label">Code</label><input id="labOrderCode" name="labOrderCode" className="form-control" placeholder="CBC" /></div>
                    <div className="col-12"><label htmlFor="labOrderNote" className="form-label">Notes</label><textarea id="labOrderNote" name="labOrderNote" className="form-control" rows={2} dir="auto" /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save lab order</button></div>
                  </form>
                </div>

                <div className="col-lg-6">
                  <h3 className="h6">New result</h3>
                  <form action={createDiagnosticReportAction} className="row g-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-md-6">
                      <TerminologyTextField
                        domain="diagnostic-report"
                        name="diagnosticTitle"
                        label="Report title"
                        placeholder="Type diagnostic report title"
                        required
                      />
                    </div>
                    <div className="col-md-3"><label htmlFor="diagnosticCategory" className="form-label">Category</label><select id="diagnosticCategory" name="diagnosticCategory" className="form-select" defaultValue="lab"><option value="lab">Lab</option><option value="imaging">Imaging</option><option value="other">Other</option></select></div>
                    <div className="col-md-3"><label htmlFor="diagnosticStatus" className="form-label">Status</label><select id="diagnosticStatus" name="diagnosticStatus" className="form-select" defaultValue="final"><option value="preliminary">Preliminary</option><option value="final">Final</option><option value="amended">Amended</option><option value="corrected">Corrected</option><option value="appended">Appended</option></select></div>
                    <div className="col-md-4"><label htmlFor="diagnosticIssuedOn" className="form-label">Issued on</label><input id="diagnosticIssuedOn" name="diagnosticIssuedOn" type="date" className="form-control" /></div>
                    <div className="col-md-4"><label htmlFor="diagnosticEffectiveOn" className="form-label">Effective on</label><input id="diagnosticEffectiveOn" name="diagnosticEffectiveOn" type="date" className="form-control" /></div>
                    <div className="col-md-4">
                      <label htmlFor="linkedLabOrderId" className="form-label">Linked order</label>
                      <select id="linkedLabOrderId" name="linkedLabOrderId" className="form-select" defaultValue="">
                        <option value="">None</option>
                        {labOrders.map((order) => (
                          <option key={order.id} value={order.id}>{order.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="diagnosticConclusion" className="form-label">Conclusion</label><textarea id="diagnosticConclusion" name="diagnosticConclusion" className="form-control" rows={2} dir="auto" /></div>
                    <div className="col-12"><label htmlFor="diagnosticNote" className="form-label">Notes</label><textarea id="diagnosticNote" name="diagnosticNote" className="form-control" rows={2} dir="auto" /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save result</button></div>
                  </form>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-6">
                  <h3 className="h6">Orders</h3>
                  {labOrdersError && <div className="alert alert-warning" role="alert">Could not load lab orders: {labOrdersError}</div>}
                  {!labOrdersError && labOrders.length === 0 && <div className="alert alert-info mb-0" role="alert">No lab or imaging orders yet.</div>}
                  {!labOrdersError && labOrders.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>Ordered</th></tr></thead>
                        <tbody>
                          {labOrders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <div className="fw-semibold">{order.title}</div>
                                <div className="text-muted small">{order.note ?? '—'}</div>
                              </td>
                              <td className="text-capitalize">{order.status}</td>
                              <td className="text-capitalize">{order.category ?? '—'}</td>
                              <td>{order.authoredOn ? new Date(order.authoredOn).toLocaleString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {nursingShiftHandoffWrite && (
                <div className="col-lg-6">
                  <h3 className="h6">Nursing shift handoff (end of shift)</h3>
                  <p className="small text-muted">Handoff is accepted only when submitted within 500m of the patient location.</p>
                  <form action={createNursingShiftHandoffAction} className="row g-2">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-12"><label htmlFor="handoff-encounter" className="form-label">Linked visit</label><select id="handoff-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                    <div className="col-md-6"><label htmlFor="handoff-start" className="form-label">Shift start</label><input id="handoff-start" name="shiftStartAt" type="datetime-local" className="form-control" required /></div>
                    <div className="col-md-6"><label htmlFor="handoff-end" className="form-label">Shift end</label><input id="handoff-end" name="shiftEndAt" type="datetime-local" className="form-control" required /></div>
                    <div className="col-12">
                      <label htmlFor="handoff-status" className="form-label">Patient status summary</label>
                      <select id="handoff-status" name="patientStatusSummary" className="form-select" defaultValue="Stable; no acute change this shift" required>
                        {NURSING_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="handoff-pending" className="form-label">Pending tasks summary</label>
                      <select id="handoff-pending" name="pendingTasksSummary" className="form-select" defaultValue="No pending clinical tasks" required>
                        {PENDING_TASK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="handoff-medsafety" className="form-label">Medication safety summary</label>
                      <select id="handoff-medsafety" name="medicationSafetySummary" className="form-select" defaultValue="No medication safety issues this shift" required>
                        {MEDICATION_SAFETY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="handoff-escalation" className="form-label">Escalation status</label><select id="handoff-escalation" name="escalationStatus" className="form-select" defaultValue="none"><option value="none">No active escalation</option><option value="active">Active escalation</option><option value="resolved">Escalation resolved this shift</option></select></div>
                    <div className="col-12">
                      <label htmlFor="handoff-next-focus" className="form-label">Next shift focus</label>
                      <select id="handoff-next-focus" name="nextShiftFocus" className="form-select" defaultValue="Routine monitoring" required>
                        {NEXT_SHIFT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="handoff-note" className="form-label">Clinical handoff note</label><textarea id="handoff-note" name="handoffNote" className="form-control" rows={3} required dir="auto" /></div>
                    <div className="col-12"><NursingHandoffLocationCapture /></div>
                    <div className="col-12">
                      <div className="form-check">
                        <input id="handoff-confirmed" name="handoffConfirmed" className="form-check-input" type="checkbox" value="true" required />
                        <label htmlFor="handoff-confirmed" className="form-check-label">
                          I confirm this handoff is complete and submitted on-site at patient location.
                        </label>
                      </div>
                    </div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Submit end-of-shift handoff</button></div>
                  </form>
                </div>
                )}

                <div className="col-lg-6">
                  <h3 className="h6">Results</h3>
                  {labResultsError && <div className="alert alert-warning" role="alert">Could not load diagnostic reports: {labResultsError}</div>}
                  {!labResultsError && labResults.length === 0 && <div className="alert alert-info mb-0" role="alert">No lab or imaging results yet.</div>}
                  {!labResultsError && labResults.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Title</th><th>Status</th><th>Conclusion</th><th>Date</th></tr></thead>
                        <tbody>
                          {labResults.map((result) => (
                            <tr key={result.id}>
                              <td>
                                <div className="fw-semibold">{result.title}</div>
                                <div className="text-muted small">{result.performer ?? '—'}</div>
                              </td>
                              <td className="text-capitalize">{result.status}</td>
                              <td>{result.conclusion ?? '—'}</td>
                              <td>{result.issued ? new Date(result.issued).toLocaleString('en-GB') : result.effective ? new Date(result.effective).toLocaleString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {isTab('measurements') && (
          <div id="patient-assessments" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Assessments</h2>
              <span className="text-muted small">{assessments.length} records</span>
            </div>
            <div className="card-body">
              <form action={createAssessmentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-5">
                  <label htmlFor="assessmentTitle" className="form-label">Assessment</label>
                  <select id="assessmentTitle" name="assessmentTitle" className="form-select" defaultValue="Mobility and gait review" required>
                    {ASSESSMENT_OPTIONS.map((option) => <option key={option.title} value={option.title}>{option.title}</option>)}
                    <option value="Other structured assessment">Other structured assessment</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="assessmentType" className="form-label">Type</label>
                  <select id="assessmentType" name="assessmentType" className="form-select" defaultValue="mobility">
                    <option value="functional">Functional</option>
                    <option value="mobility">Mobility</option>
                    <option value="pain">Pain</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-2"><label htmlFor="assessmentScore" className="form-label">Score</label><input id="assessmentScore" name="assessmentScore" type="number" step="1" min="0" max="100" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="assessmentEncounterId" className="form-label">Visit</label><select id="assessmentEncounterId" name="assessmentEncounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                <div className="col-12">
                  <label htmlFor="assessmentSummary" className="form-label">Structured finding</label>
                  <select id="assessmentSummary" name="assessmentSummary" className="form-select" defaultValue="Mobility reviewed with transfer and gait safety recommendations." required>
                    {ASSESSMENT_OPTIONS.map((option) => <option key={option.summary} value={option.summary}>{option.summary}</option>)}
                    <option value="Findings reviewed; see note for details.">Findings reviewed; see note for details.</option>
                  </select>
                </div>
                <div className="col-12"><label htmlFor="assessmentNote" className="form-label">Notes</label><textarea id="assessmentNote" name="assessmentNote" className="form-control" rows={2} placeholder="Optional follow-up details" dir="auto" /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save assessment</button></div>
              </form>

              {assessmentsError && <div className="alert alert-warning" role="alert">Could not load assessments: {assessmentsError}</div>}
              {!assessmentsError && assessments.length === 0 && <div className="alert alert-info mb-0" role="alert">No assessments recorded yet.</div>}
              {!assessmentsError && assessments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Title</th><th>Type</th><th>Score</th><th>Summary</th></tr></thead>
                    <tbody>
                      {assessments.map((assessment) => (
                        <tr key={assessment.id}>
                          <td>
                            <div className="fw-semibold">{assessment.title}</div>
                            <div className="text-muted small">{assessment.author ?? '—'}</div>
                          </td>
                          <td className="text-capitalize">{assessment.type}</td>
                          <td>{assessment.score ?? '—'}</td>
                          <td className="text-muted small">{assessment.summary ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('care-team-consent') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Caregiver portal consent</h2>
              <span className="text-muted small">{caregiverConsents.length} consent records</span>
            </div>
            <div className="card-body">
              <form action={upsertCaregiverConsentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <input type="hidden" name="consentId" value={caregiverConsents[0]?.id ?? ''} />
                <input type="hidden" name="consentVersionId" value={caregiverConsents[0]?.versionId ?? ''} />

                <div className="col-md-6">
                  <label htmlFor="caregiver-phone" className="form-label">Caregiver phone</label>
                  <input
                    id="caregiver-phone"
                    name="caregiverPhone"
                    type="text"
                    className="form-control"
                    defaultValue={caregiverConsents[0]?.caregiverPhone ?? localPatient?.primaryCaregiverPhone ?? ''}
                    placeholder="+2010..."
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="caregiver-email" className="form-label">Caregiver email</label>
                  <input
                    id="caregiver-email"
                    name="caregiverEmail"
                    type="email"
                    className="form-control"
                    defaultValue={caregiverConsents[0]?.caregiverEmail ?? localPatient?.primaryCaregiverEmail ?? ''}
                    placeholder="caregiver@example.com"
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="consent-decision" className="form-label">Consent decision</label>
                  <select
                    id="consent-decision"
                    name="decision"
                    className="form-select"
                    defaultValue={caregiverConsents[0]?.decision ?? 'allow'}
                    required
                  >
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>

                <div className="col-md-8">
                  <label className="form-label d-block">Shared portal scopes</label>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="form-check"><input id="scope-profile" className="form-check-input" type="checkbox" name="scopeProfile" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('profile') ?? true} /><label htmlFor="scope-profile" className="form-check-label">Profile</label></div>
                    <div className="form-check"><input id="scope-visits" className="form-check-input" type="checkbox" name="scopeVisits" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('visits') ?? true} /><label htmlFor="scope-visits" className="form-check-label">Visits</label></div>
                    <div className="form-check"><input id="scope-vitals" className="form-check-input" type="checkbox" name="scopeVitals" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('vitals') ?? false} /><label htmlFor="scope-vitals" className="form-check-label">Vitals</label></div>
                    <div className="form-check"><input id="scope-notes" className="form-check-input" type="checkbox" name="scopeNotes" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('notes') ?? false} /><label htmlFor="scope-notes" className="form-check-label">Notes</label></div>
                    <div className="form-check"><input id="scope-tasks" className="form-check-input" type="checkbox" name="scopeTasks" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('tasks') ?? false} /><label htmlFor="scope-tasks" className="form-check-label">Tasks</label></div>
                  </div>
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Save caregiver consent</button>
                </div>
              </form>

              {caregiverConsentsError && <div className="alert alert-warning" role="alert">Could not load caregiver consents: {caregiverConsentsError}</div>}
              {!caregiverConsentsError && caregiverConsents.length === 0 && <div className="alert alert-info mb-0" role="alert">No caregiver consent configured yet for this patient.</div>}
              {!caregiverConsentsError && caregiverConsents.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Decision</th><th>Caregiver</th><th>Scopes</th><th>Updated</th></tr></thead>
                    <tbody>
                      {caregiverConsents.map((consent) => (
                        <tr key={consent.id}>
                          <td className="text-capitalize">{consent.decision}</td>
                          <td>{consent.caregiverPhone ?? consent.caregiverEmail ?? '—'}</td>
                          <td>{consent.scopes.length > 0 ? consent.scopes.join(', ') : '—'}</td>
                          <td>{consent.updatedAt ? new Date(consent.updatedAt).toLocaleString('en-GB') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('visits-encounters') && (
          <div id="patient-visits" className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Record a visit</h2>
            </div>
            <div className="card-body">
              <form action={recordVisitAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />

                <div className="col-md-4">
                  <label htmlFor="visit-status" className="form-label">Status</label>
                  <select id="visit-status" name="status" className="form-select" defaultValue="planned" required>
                    <option value="planned">Scheduled</option>
                    <option value="in-progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label htmlFor="visit-type" className="form-label">Visit type</label>
                  <select id="visit-type" name="visitType" className="form-select" defaultValue="in_home" required>
                    <option value="in_home">In-home</option>
                    <option value="clinic">Clinic</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label htmlFor="visit-start-at" className="form-label">Date and time</label>
                  <input id="visit-start-at" name="startAt" type="datetime-local" className="form-control" required />
                </div>

                <div className="col-12">
                  <label htmlFor="visit-notes" className="form-label">Notes</label>
                  <select id="visit-notes" name="notes" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {VISIT_NOTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Save visit</button>
                </div>
              </form>

              <hr className="my-4" />

              <h3 className="h6">Visit workflow state machine (local schedule records)</h3>
              {localVisitsError && <div className="alert alert-warning" role="alert">Could not load workflow visits: {localVisitsError}</div>}
              {!localVisitsError && localVisits.length === 0 && (
                <div className="alert alert-info mb-0" role="alert">
                  No local scheduled visits found yet. Create visits from booking/ops flow to use workflow actions.
                </div>
              )}

              {!localVisitsError && localVisits.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Visit</th>
                        <th>State</th>
                        <th>Timeline</th>
                        <th>Check-in/out geo</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localVisits.map((visit) => (
                        <tr key={visit.id}>
                          <td>
                            <div className="fw-semibold">{visit.code}</div>
                            <div className="text-muted small">
                              {new Date(visit.scheduledDate).toLocaleDateString('en-GB')}
                              {visit.scheduledTime ? ` · ${visit.scheduledTime}` : ''}
                              {visit.providerName ? ` · ${visit.providerName}` : ''}
                            </div>
                          </td>
                          <td className="text-capitalize">{workflowStateLabel(visit.effectiveState)}</td>
                          <td className="small text-muted">
                            <div>Ack: {visit.acknowledgedAt ? new Date(visit.acknowledgedAt).toLocaleString('en-GB') : '—'}</div>
                            <div>En route: {visit.enRouteAt ? new Date(visit.enRouteAt).toLocaleString('en-GB') : '—'}</div>
                            <div>Arrived: {visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString('en-GB') : '—'}</div>
                            <div>Check-in: {visit.checkInAt ? new Date(visit.checkInAt).toLocaleString('en-GB') : '—'}</div>
                            <div>Check-out: {visit.checkOutAt ? new Date(visit.checkOutAt).toLocaleString('en-GB') : '—'}</div>
                            {visit.transitionTimeline.length > 0 && (
                              <div className="mt-1">
                                {visit.transitionTimeline.slice(0, 2).map((entry) => (
                                  <div key={`${visit.id}-${entry.toState}-${entry.createdAt}`}>
                                    {workflowStateLabel(entry.toState)} · {new Date(entry.createdAt).toLocaleString('en-GB')}
                                    {entry.isOverride ? ` · override (${entry.overrideMethod ?? 'manual'})` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="small text-muted">
                            <div>In: {visit.checkInLat && visit.checkInLng ? `${visit.checkInLat}, ${visit.checkInLng}` : '—'}</div>
                            <div>Out: {visit.checkOutLat && visit.checkOutLng ? `${visit.checkOutLat}, ${visit.checkOutLng}` : '—'}</div>
                            <div>Acc: {visit.checkInAccuracyM ?? '—'} m</div>
                          </td>
                          <td>
                            <div className="d-grid gap-2">
                              <form action={acknowledgeVisitAction} className="d-flex gap-2">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <input name="acknowledgedAt" type="datetime-local" className="form-control form-control-sm" required />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Acknowledge</button>
                              </form>

                              <form action={startTravelAction} className="d-flex gap-2">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <input name="enRouteAt" type="datetime-local" className="form-control form-control-sm" required />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Start travel</button>
                              </form>

                              <form action={markArrivedAction} className="d-flex gap-2">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <input name="arrivedAt" type="datetime-local" className="form-control form-control-sm" required />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Mark arrived</button>
                              </form>

                              <form action={checkInVisitAction} className="row g-1">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <div className="col-12"><input name="checkInAt" type="datetime-local" className="form-control form-control-sm" required /></div>
                                <div className="col-6"><input name="checkInLatitude" className="form-control form-control-sm" placeholder="Lat" required /></div>
                                <div className="col-6"><input name="checkInLongitude" className="form-control form-control-sm" placeholder="Lng" required /></div>
                                <div className="col-12"><input name="checkInAccuracyMeters" className="form-control form-control-sm" placeholder="Accuracy meters" /></div>
                                <div className="col-12">
                                  <select name="geofenceOverrideMethod" className="form-select form-select-sm" defaultValue="">
                                    <option value="">No geofence override</option>
                                    <option value="med_ops">Med Ops unlock</option>
                                    <option value="code">Patient verification code</option>
                                    <option value="photo">Door photo proof</option>
                                  </select>
                                </div>
                                <div className="col-12"><input name="geofenceOverrideReason" className="form-control form-control-sm" placeholder="Override reason (required if geofence fails)" dir="auto" /></div>
                                <div className="col-12"><input name="geofenceOverrideMediaId" className="form-control form-control-sm" placeholder="Proof media id (optional)" dir="auto" /></div>
                                <div className="col-12"><button type="submit" className="btn btn-sm btn-outline-success w-100">Check in</button></div>
                              </form>

                              <form action={checkOutVisitAction} className="row g-1">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <div className="col-12"><input name="checkOutAt" type="datetime-local" className="form-control form-control-sm" required /></div>
                                <div className="col-6"><input name="checkOutLatitude" className="form-control form-control-sm" placeholder="Lat" required /></div>
                                <div className="col-6"><input name="checkOutLongitude" className="form-control form-control-sm" placeholder="Lng" required /></div>
                                <div className="col-12"><input name="checkOutAccuracyMeters" className="form-control form-control-sm" placeholder="Accuracy meters" /></div>
                                <div className="col-12"><button type="submit" className="btn btn-sm btn-outline-success w-100">Check out</button></div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('visits-encounters') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Visits</h2>
              <span className="text-muted small">{encounters.length} records</span>
            </div>
            <div className="card-body">
              {encountersError && <div className="alert alert-warning" role="alert">Could not load visits: {encountersError}</div>}
              {!encountersError && encounters.length === 0 && <div className="alert alert-info mb-0" role="alert">No visits are recorded yet.</div>}
              {encounters.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Recorded by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {encounters.map((encounter) => (
                        <tr key={encounter.id}>
                          <td>{encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : '—'}</td>
                          <td>{encounterStatusLabel(encounter.status)}</td>
                          <td className="text-capitalize">{encounterVisitType(encounter)}</td>
                          <td>{encounter.participant?.[0]?.individual?.display ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('care-plan-goals') && (
          <>
          <div id="patient-care-plan-goals" className="row g-3">
            <div className="col-lg-6">
              <div className="card bg-white h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="h6 mb-0">Care plans</h2>
                  <span className="text-muted small">{carePlans.length} records</span>
                </div>
                <div className="card-body">
                  {carePlansError && <div className="alert alert-warning mb-0" role="alert">Could not load care plans: {carePlansError}</div>}
                  {!carePlansError && carePlans.length === 0 && <div className="alert alert-info mb-0" role="alert">No formal care plans are active in Medplum yet.</div>}
                  {!carePlansError && carePlans.length > 0 && (
                    <div className="list-group list-group-flush">
                      {carePlans.map((carePlan) => (
                        <div key={carePlan.id} className="list-group-item px-0">
                          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{carePlan.title}</div>
                              <div className="small text-muted">
                                {carePlan.program ?? 'Clinical program'} &middot; {formatClinicalDate(carePlan.start)} to {formatClinicalDate(carePlan.end)}
                              </div>
                            </div>
                            <span className={`badge ${carePlanStatusBadgeClass(carePlan.status)}`}>{workflowStateLabel(carePlan.status)}</span>
                          </div>
                          {carePlan.description && <p className="small text-muted mb-0 mt-2">{carePlan.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card bg-white h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="h6 mb-0">Patient goals</h2>
                  <span className="text-muted small">{goals.length} records</span>
                </div>
                <div className="card-body">
                  {goalsError && <div className="alert alert-warning mb-0" role="alert">Could not load patient goals: {goalsError}</div>}
                  {!goalsError && goals.length === 0 && <div className="alert alert-info mb-0" role="alert">No structured goals are recorded yet.</div>}
                  {!goalsError && goals.length > 0 && (
                    <div className="list-group list-group-flush">
                      {goals.map((goal) => (
                        <div key={goal.id} className="list-group-item px-0">
                          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{goal.text}</div>
                              <div className="small text-muted">{goal.category ?? 'Goal'} &middot; target {formatClinicalDate(goal.targetDate)}</div>
                            </div>
                            <span className={`badge ${goalStatusBadgeClass(goal.status)}`}>{goalStatusLabel(goal.status)}</span>
                          </div>
                          <div className="small text-muted mt-2">
                            Current: {goal.currentValue ?? '—'} &middot; Target: {goal.targetValue ?? '—'}
                            {goal.measurementUnit ? ` ${goal.measurementUnit}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Standing orders</h2>
              <span className="text-muted small">{standingOrders.length} records</span>
            </div>
            <div className="card-body d-grid gap-3">
              <form action={createStandingOrderAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="standingOrderDiscipline" className="form-label">Discipline</label>
                  <select id="standingOrderDiscipline" name="standingOrderDiscipline" className="form-select" defaultValue="medical">
                    <option value="medical">Medical</option>
                    <option value="nursing">Nursing</option>
                    <option value="physiotherapy">Physiotherapy</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <label htmlFor="standingOrderTitle" className="form-label">Title</label>
                  <input id="standingOrderTitle" name="standingOrderTitle" className="form-control" placeholder="Fever panel standing order" required />
                </div>
                <div className="col-md-4">
                  <label htmlFor="standingOrderValidUntil" className="form-label">Valid until</label>
                  <input id="standingOrderValidUntil" name="standingOrderValidUntil" type="datetime-local" className="form-control" />
                </div>
                <div className="col-12">
                  <label htmlFor="standingOrderInstructions" className="form-label">Instructions</label>
                  <textarea id="standingOrderInstructions" name="standingOrderInstructions" rows={2} className="form-control" required dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-outline-primary">Create standing order</button>
                </div>
              </form>

              {standingOrdersError && <div className="alert alert-warning" role="alert">Could not load standing orders: {standingOrdersError}</div>}
              {!standingOrdersError && standingOrders.length === 0 && <div className="alert alert-info mb-0" role="alert">No standing orders configured yet.</div>}
              {!standingOrdersError && standingOrders.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr><th>Order</th><th>Status</th><th>Last execution</th><th>Execute</th></tr>
                    </thead>
                    <tbody>
                      {standingOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <div className="fw-semibold">{order.title}</div>
                            <div className="small text-muted text-capitalize">{order.discipline} · {order.instructions}</div>
                          </td>
                          <td>
                            <span className={`badge ${order.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>{order.isActive ? 'Active' : 'Inactive'}</span>
                            <div className="small text-muted">Exec count: {order.executionCount}</div>
                          </td>
                          <td>{order.lastExecutionAt ? new Date(order.lastExecutionAt).toLocaleString('en-GB') : 'Never'}</td>
                          <td>
                            <form action={executeStandingOrderAction} className="row g-1">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="standingOrderId" value={order.id} />
                              <div className="col-12">
                                <select name="executionVisitId" className="form-select form-select-sm" defaultValue="" required>
                                  <option value="" disabled>Select active visit</option>
                                  {localVisits.filter((visit) => Boolean(visit.checkInAt) && !visit.checkOutAt).map((visit) => (
                                    <option key={visit.id} value={visit.id}>{visit.code}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-12"><input name="executionRecordedAt" type="datetime-local" className="form-control form-control-sm" required /></div>
                              <div className="col-12"><input name="executionNote" className="form-control form-control-sm" placeholder="Execution note" /></div>
                              <div className="col-12"><button type="submit" className="btn btn-sm btn-outline-success w-100">Execute</button></div>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          </>
          )}

          {isTab('measurements') && (
          <div id="patient-vitals" className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Record vitals</h2>
            </div>
            <div className="card-body">
              <form action={recordVitalsAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="vitals-encounter" className="form-label">Linked visit</label>
                  <select id="vitals-encounter" name="encounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="vitals-recorded-at" className="form-label">Recorded at</label>
                  <input id="vitals-recorded-at" name="recordedAt" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-2"><label htmlFor="vitals-systolic" className="form-label">Systolic</label><input id="vitals-systolic" name="systolicBp" type="number" min="40" max="280" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-diastolic" className="form-label">Diastolic</label><input id="vitals-diastolic" name="diastolicBp" type="number" min="20" max="180" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-hr" className="form-label">HR</label><input id="vitals-hr" name="heartRate" type="number" min="20" max="240" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-spo2" className="form-label">SpO2</label><input id="vitals-spo2" name="spo2Pct" type="number" min="40" max="100" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-temp" className="form-label">Temp C</label><input id="vitals-temp" name="temperatureC" type="number" step="0.1" min="30" max="45" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-weight" className="form-label">Weight kg</label><input id="vitals-weight" name="weightKg" type="number" step="0.1" min="1" max="300" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-glucose" className="form-label">Glucose mg/dL</label><input id="vitals-glucose" name="glucoseMgDl" type="number" min="20" max="600" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-pain" className="form-label">Pain (0-10)</label><input id="vitals-pain" name="painScore" type="number" min="0" max="10" className="form-control" /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save vitals</button></div>
              </form>
            </div>
          </div>
          )}

          {isTab('measurements') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Recent vitals</h2>
              <span className="text-muted small">{vitals.length} rows</span>
            </div>
            <div className="card-body">
              {vitalsError && <div className="alert alert-warning" role="alert">Could not load vitals: {vitalsError}</div>}
              {!vitalsError && vitals.length === 0 && <div className="alert alert-info mb-0" role="alert">No vitals are recorded yet.</div>}
              {vitals.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Recorded</th><th>BP</th><th>HR</th><th>SpO2</th><th>Temp</th><th>Weight</th><th>Glucose</th><th>Pain</th></tr></thead>
                    <tbody>
                      {vitals.map((row, index) => (
                        <tr key={`${row.measuredAt}-${index}`}>
                          <td>{new Date(row.measuredAt).toLocaleString('en-GB')}</td>
                          <td>{row.systolicBp && row.diastolicBp ? `${row.systolicBp}/${row.diastolicBp}` : '—'}</td>
                          <td>{row.heartRate ?? '—'}</td>
                          <td>{row.spo2Pct ?? '—'}</td>
                          <td>{row.temperatureC ?? '—'}</td>
                          <td>{row.weightKg ?? '—'}</td>
                          <td>{row.glucoseMgDl ?? '—'}</td>
                          <td>{row.painScore ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('notes-reports') && (
          <div className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Clinical notes</h2></div>
            <div className="card-body">
              <form action={createClinicalNoteDraftAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4"><label htmlFor="note-encounter" className="form-label">Linked visit</label><select id="note-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : encounter.id}</option>))}</select></div>
                <div className="col-md-4">
                  <label htmlFor="note-discipline" className="form-label">Discipline</label>
                  <select id="note-discipline" name="noteDiscipline" className="form-select" defaultValue="medical">
                    <option value="medical">Medical</option>
                    <option value="nursing">Nursing</option>
                    <option value="physiotherapy">Physiotherapy</option>
                  </select>
                </div>
                <div className="col-md-4"><label htmlFor="note-title" className="form-label">Title</label><input id="note-title" name="noteTitle" type="text" className="form-control" placeholder="Visit assessment" /></div>
                <div className="col-12"><label htmlFor="note-body" className="form-label">Note body</label><textarea id="note-body" name="noteBody" className="form-control" rows={4} placeholder="Clinical findings, plan, and follow up" dir="auto" required /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save draft note</button></div>
              </form>
            </div>
          </div>
          )}

          {isTab('notes-reports') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center"><h2 className="h6 mb-0">Notes timeline</h2><span className="text-muted small">{clinicalNotes.length} notes</span></div>
            <div className="card-body">
              {clinicalNotesError && <div className="alert alert-warning" role="alert">Could not load notes: {clinicalNotesError}</div>}
              {!clinicalNotesError && clinicalNotes.length === 0 && <div className="alert alert-info mb-0" role="alert">No notes recorded yet.</div>}
              {clinicalNotes.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Date</th><th>Title</th><th>Status</th><th>Author</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {clinicalNotes.map((note) => (
                        <tr key={note.id}>
                          <td>{new Date(note.date).toLocaleString('en-GB')}</td>
                          <td><div className="fw-semibold">{note.title}</div><div className="text-muted small">{note.body || '—'}</div></td>
                          <td className="text-capitalize">{note.status}</td>
                          <td>{note.author ?? '—'}</td>
                          <td className="text-end">
                            {note.status === 'preliminary' ? (
                              <form action={signClinicalNoteAction}>
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="compositionId" value={note.id} />
                                <input type="hidden" name="noteDiscipline" value={note.discipline ?? 'medical'} />
                                <input type="hidden" name="noteVersionId" value={note.versionId ?? ''} />
                                <button type="submit" className="btn btn-sm btn-outline-success">Sign off</button>
                              </form>
                            ) : (
                              <div className="d-grid gap-1">
                                <span className="badge text-bg-success">Signed</span>
                                <form action={amendClinicalNoteAction} className="d-grid gap-1">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="sourceCompositionId" value={note.id} />
                                  <input type="hidden" name="noteDiscipline" value={note.discipline ?? 'medical'} />
                                  <input type="hidden" name="amendmentTitle" value={`Amendment: ${note.title}`} />
                                  <textarea name="amendmentBody" className="form-control form-control-sm" rows={2} placeholder="Addendum note" dir="auto" required />
                                  <button type="submit" className="btn btn-sm btn-outline-primary">Create addendum</button>
                                </form>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('care-team-consent') && (
          <div id="patient-care-team" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center"><h2 className="h6 mb-0">Care team assignment</h2><span className="text-muted small">{careTeamMembers.length} assigned</span></div>
            <div className="card-body">
              {careTeamError && <div className="alert alert-warning" role="alert">Could not load care team: {careTeamError}</div>}
              <form action={assignCareTeamMemberAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <input type="hidden" name="careTeamVersionId" value={careTeam?.meta?.versionId ?? ''} />
                <div className="col-md-9"><label htmlFor="care-team-staff" className="form-label">Assign staff member</label><select id="care-team-staff" name="staffId" className="form-select" required defaultValue=""><option value="" disabled>Select staff...</option>{assignableStaff.map((staff) => (<option key={staff.id} value={staff.id}>{staff.name} · {staff.role}</option>))}</select></div>
                <div className="col-md-3 d-flex align-items-end"><button type="submit" className="btn btn-primary w-100">Assign</button></div>
              </form>

              {careTeamMembers.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">No care team members assigned yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Staff</th><th>Role</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {careTeamMembers.map((member, index) => {
                        const practitionerReference = member.member?.reference ?? '';
                        const role = member.role?.[0]?.coding?.[0]?.display ?? member.role?.[0]?.coding?.[0]?.code ?? '—';
                        return (
                          <tr key={`${practitionerReference}-${index}`}>
                            <td>{member.member?.display ?? (practitionerReference || '—')}</td>
                            <td className="text-capitalize">{role}</td>
                            <td className="text-end">
                              {practitionerReference ? (
                                <form action={unassignCareTeamMemberAction}>
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="practitionerReference" value={practitionerReference} />
                                  <input type="hidden" name="careTeamVersionId" value={careTeam?.meta?.versionId ?? ''} />
                                  <button type="submit" className="btn btn-sm btn-outline-danger">Unassign</button>
                                </form>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Incident / Near-miss report</h2>
              <span className="text-muted small">Safety event capture</span>
            </div>
            <div className="card-body">
              <form action={createIncidentReportAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="incidentType" className="form-label">Type</label>
                  <select id="incidentType" name="incidentType" className="form-select" defaultValue="near_miss">
                    <option value="fall">Fall</option>
                    <option value="med_error">Medication error</option>
                    <option value="pressure_injury">Pressure injury</option>
                    <option value="equipment_failure">Equipment failure</option>
                    <option value="near_miss">Near miss</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="incidentSeverity" className="form-label">Severity</label>
                  <select id="incidentSeverity" name="incidentSeverity" className="form-select" defaultValue="urgent">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="asap">ASAP</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="incidentEncounterId" className="form-label">Related visit</label>
                  <select id="incidentEncounterId" name="encounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <div className="form-check">
                    <input id="incidentEscalationNeeded" name="incidentEscalationNeeded" type="checkbox" className="form-check-input" value="true" />
                    <label htmlFor="incidentEscalationNeeded" className="form-check-label">Auto-escalate now</label>
                  </div>
                </div>
                <div className="col-12">
                  <label htmlFor="incidentSummary" className="form-label">What happened</label>
                  <textarea id="incidentSummary" name="incidentSummary" rows={3} className="form-control" required dir="auto" />
                </div>
                <div className="col-12">
                  <label htmlFor="incidentActionsTaken" className="form-label">Immediate actions taken</label>
                  <select id="incidentActionsTaken" name="incidentActionsTaken" className="form-select" defaultValue="">
                    <option value="">No action selected</option>
                    {INCIDENT_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Submit incident report</button>
                </div>
              </form>
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Shift roster and acknowledgment</h2>
              <span className="text-muted small">{nurseShiftAssignments.length} assignments</span>
            </div>
            <div className="card-body d-grid gap-3">
              <form action={createNurseShiftAssignmentAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="primaryNurseStaffId" className="form-label">Primary nurse</label>
                  <select id="primaryNurseStaffId" name="primaryNurseStaffId" className="form-select" defaultValue="" required>
                    <option value="" disabled>Select nurse...</option>
                    {assignableStaff.filter((staff) => staff.role === 'nurse').map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="shiftStartAt" className="form-label">Shift start</label>
                  <input id="shiftStartAt" name="shiftStartAt" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-3">
                  <label htmlFor="shiftEndAt" className="form-label">Shift end</label>
                  <input id="shiftEndAt" name="shiftEndAt" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button type="submit" className="btn btn-outline-primary w-100">Add shift</button>
                </div>
                <div className="col-12">
                  <label htmlFor="shiftNotes" className="form-label">Notes</label>
                  <select id="shiftNotes" name="shiftNotes" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {NEXT_SHIFT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </form>

              {nurseShiftAssignmentsError && <div className="alert alert-warning" role="alert">Could not load shift assignments: {nurseShiftAssignmentsError}</div>}
              {!nurseShiftAssignmentsError && nurseShiftAssignments.length === 0 && <div className="alert alert-info mb-0" role="alert">No shift assignments yet.</div>}
              {!nurseShiftAssignmentsError && nurseShiftAssignments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Primary nurse</th><th>Window</th><th>Status</th><th>Acknowledged</th><th>Ack action</th></tr></thead>
                    <tbody>
                      {nurseShiftAssignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>{assignment.primaryNurseName}</td>
                          <td>
                            <div>{new Date(assignment.shiftStartAt).toLocaleString('en-GB')}</div>
                            <div className="text-muted small">to {new Date(assignment.shiftEndAt).toLocaleString('en-GB')}</div>
                          </td>
                          <td className="text-capitalize">{assignment.status.replace('_', ' ')}</td>
                          <td>{assignment.acknowledgedAt ? new Date(assignment.acknowledgedAt).toLocaleString('en-GB') : 'Pending'}</td>
                          <td>
                            <form action={acknowledgeIncomingNurseAction} className="d-grid gap-2">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="assignmentId" value={assignment.id} />
                              <select name="incomingNurseStaffId" className="form-select form-select-sm" defaultValue="">
                                <option value="">Current nurse account</option>
                                {assignableStaff.filter((staff) => staff.role === 'nurse').map((staff) => (
                                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                                ))}
                              </select>
                              <input name="acknowledgedAt" type="datetime-local" className="form-control form-control-sm" required />
                              <input name="acknowledgementNote" className="form-control form-control-sm" placeholder="Ack note" />
                              <button type="submit" className="btn btn-sm btn-outline-success">Acknowledge</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Patient geofence policy</h2></div>
            <div className="card-body">
              <form action={updatePatientGeoPolicyAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="handoffGeofenceRadiusMeters" className="form-label">Handoff radius override (meters)</label>
                  <input
                    id="handoffGeofenceRadiusMeters"
                    name="handoffGeofenceRadiusMeters"
                    type="number"
                    min="50"
                    max="5000"
                    className="form-control"
                    defaultValue={localPatient?.handoffGeofenceRadiusMeters ?? ''}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="temporarilyAwayUntil" className="form-label">Patient temporarily away until</label>
                  <input
                    id="temporarilyAwayUntil"
                    name="temporarilyAwayUntil"
                    type="datetime-local"
                    className="form-control"
                    defaultValue={localPatient?.temporarilyAwayUntil ? localPatient.temporarilyAwayUntil.slice(0, 16) : ''}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="temporarilyAwayNote" className="form-label">Temporary away note</label>
                  <select
                    id="temporarilyAwayNote"
                    name="temporarilyAwayNote"
                    className="form-select"
                    defaultValue={localPatient?.temporarilyAwayNote ?? ''}
                  >
                    <option value="">None</option>
                    {TEMPORARILY_AWAY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-outline-primary">Save geofence policy</button>
                </div>
              </form>
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Clinical communication thread</h2>
              <span className="text-muted small">{communications.length} messages</span>
            </div>
            <div className="card-body">
              <form action={createCommunicationAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="communicationCategory" className="form-label">Category</label>
                  <select id="communicationCategory" name="communicationCategory" className="form-select" defaultValue="clinical-update">
                    <option value="clinical-update">Clinical update</option>
                    <option value="handoff">Handoff</option>
                    <option value="escalation">Escalation</option>
                    <option value="incident">Incident</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="communicationPriority" className="form-label">Priority</label>
                  <select id="communicationPriority" name="communicationPriority" className="form-select" defaultValue="routine">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="asap">ASAP</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="communicationRecipientStaffId" className="form-label">Assign to</label>
                  <select id="communicationRecipientStaffId" name="communicationRecipientStaffId" className="form-select" defaultValue="">
                    <option value="">Any assigned team</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {staff.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="communicationEncounterId" className="form-label">Related visit</label>
                  <select id="communicationEncounterId" name="communicationEncounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="communicationMessage" className="form-label">Message</label>
                  <select id="communicationMessage" name="communicationMessage" className="form-select" defaultValue="Clinical update documented; no action required." required>
                    {COMMUNICATION_MESSAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Send communication</button>
                </div>
              </form>

              {communicationsError && <div className="alert alert-warning" role="alert">Could not load communications: {communicationsError}</div>}
              {!communicationsError && communications.length === 0 && <div className="alert alert-info mb-0" role="alert">No communications logged yet.</div>}
              {!communicationsError && communications.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Sent</th><th>Category</th><th>Priority</th><th>Message</th><th>From</th><th>To</th></tr></thead>
                    <tbody>
                      {communications.map((communication) => (
                        <tr key={communication.id}>
                          <td>{communication.sentAt ? new Date(communication.sentAt).toLocaleString('en-GB') : '—'}</td>
                          <td>{communicationCategoryLabel(communication.category)}</td>
                          <td>{taskPriorityLabel(communication.priority)}</td>
                          <td className="text-muted small">{communication.message}</td>
                          <td>{communication.sender ?? '—'}</td>
                          <td>{communication.recipient ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Escalation workflow</h2>
              <span className="text-muted small">{escalationTasks.length} active escalations</span>
            </div>
            <div className="card-body">
              <form action={createEscalationAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="escalationTitle" className="form-label">Escalation title</label>
                  <select id="escalationTitle" name="escalationTitle" className="form-select" defaultValue="Abnormal vital signs" required>
                    {ESCALATION_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="escalationPriority" className="form-label">Priority</label>
                  <select id="escalationPriority" name="escalationPriority" className="form-select" defaultValue="urgent">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="asap">ASAP</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="escalationOwnerStaffId" className="form-label">Owner</label>
                  <select id="escalationOwnerStaffId" name="escalationOwnerStaffId" className="form-select" defaultValue="">
                    <option value="">Unassigned</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {staff.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label htmlFor="escalationDueDate" className="form-label">Target date</label>
                  <input id="escalationDueDate" name="escalationDueDate" type="date" className="form-control" />
                </div>
                <div className="col-md-4">
                  <label htmlFor="escalationEncounterId" className="form-label">Related visit</label>
                  <select id="escalationEncounterId" name="escalationEncounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="escalationSummary" className="form-label">Escalation summary</label>
                  <select id="escalationSummary" name="escalationSummary" className="form-select" defaultValue="Requires urgent clinician review and documented next action." required>
                    {ESCALATION_SUMMARY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Create escalation</button>
                </div>
              </form>

              <form action={runEscalationSlaSweepAction} className="mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <button type="submit" className="btn btn-outline-secondary">Run Escalation + Co-sign SLA Sweep</button>
              </form>

              {tasksError && <div className="alert alert-warning" role="alert">Could not load escalation tasks: {tasksError}</div>}
              {!tasksError && escalationTasks.length === 0 && <div className="alert alert-info mb-0" role="alert">No escalation tasks yet.</div>}
              {!tasksError && escalationTasks.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Escalation</th><th>Status</th><th>Priority</th><th>Due</th><th>Owner</th></tr></thead>
                    <tbody>
                      {escalationTasks.map((task) => (
                        <tr key={task.id}>
                          <td>
                            <div className="fw-semibold">{taskTitle(task)}</div>
                            <div className="text-muted small">{task.description ?? '—'}</div>
                          </td>
                          <td>{taskStatusLabel(task.status)}</td>
                          <td>{taskPriorityLabel(task.priority)}</td>
                          <td>{taskDueDate(task)}</td>
                          <td>{task.owner?.display ?? task.owner?.reference ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('visits-encounters') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Schedule appointment</h2>
            </div>
            <div className="card-body">
              <form action={createAppointmentAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="appointmentStart" className="form-label">Start</label>
                  <input id="appointmentStart" name="appointmentStart" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-3">
                  <label htmlFor="appointmentEnd" className="form-label">End</label>
                  <input id="appointmentEnd" name="appointmentEnd" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-2">
                  <label htmlFor="appointmentType" className="form-label">Type</label>
                  <select id="appointmentType" name="appointmentType" className="form-select" defaultValue="in_home">
                    <option value="in_home">In-home</option>
                    <option value="clinic">Clinic</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="appointmentOwnerStaffId" className="form-label">Assigned clinician</label>
                  <select id="appointmentOwnerStaffId" name="appointmentOwnerStaffId" className="form-select" defaultValue="">
                    <option value="">Not assigned</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {staff.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="appointmentNote" className="form-label">Visit note</label>
                  <select id="appointmentNote" name="appointmentNote" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {APPOINTMENT_NOTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Schedule appointment</button>
                </div>
              </form>
            </div>
          </div>
          )}

          {isTab('visits-encounters') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Appointment timeline</h2>
              <span className="text-muted small">{appointments.length} appointments</span>
            </div>
            <div className="card-body">
              {appointmentsError && <div className="alert alert-warning" role="alert">Could not load appointments: {appointmentsError}</div>}
              {!appointmentsError && appointments.length === 0 && <div className="alert alert-info mb-0" role="alert">No appointments scheduled yet.</div>}
              {!appointmentsError && appointments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Start</th><th>End</th><th>Status</th><th>Type</th><th>Assigned</th><th>Notes</th></tr></thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td>{appointment.start ? new Date(appointment.start).toLocaleString('en-GB') : '—'}</td>
                          <td>{appointment.end ? new Date(appointment.end).toLocaleString('en-GB') : '—'}</td>
                          <td>{appointmentStatusLabel(appointment.status)}</td>
                          <td>{appointmentTypeLabel(appointment.type)}</td>
                          <td>{appointment.assignedTo ?? '—'}</td>
                          <td className="text-muted small">{appointment.description ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div id="patient-tasks" className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Care tasks</h2></div>
            <div className="card-body">
              <form action={createCareTaskAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="task-title" className="form-label">Task title</label>
                  <select id="task-title" name="taskTitle" className="form-select" defaultValue="Lab follow-up" required>
                    {TASK_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="task-description" className="form-label">Description</label>
                  <select id="task-description" name="taskDescription" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {TASK_DESCRIPTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-2"><label htmlFor="task-due-date" className="form-label">Due date</label><input id="task-due-date" name="taskDueDate" type="date" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="task-encounter" className="form-label">Visit</label><select id="task-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Create task</button></div>
              </form>

              {tasksError && <div className="alert alert-warning" role="alert">Could not load tasks: {tasksError}</div>}
              {!tasksError && tasks.length === 0 && <div className="alert alert-info mb-0" role="alert">No care tasks yet.</div>}
              {tasks.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Task</th><th>Status</th><th>Due</th><th className="text-end">Update</th></tr></thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id}>
                          <td><div className="fw-semibold">{taskTitle(task)}</div><div className="text-muted small">{task.description ?? '—'}</div></td>
                          <td>{taskStatusLabel(task.status)}</td>
                          <td>{taskDueDate(task)}</td>
                          <td className="text-end">
                            <form action={updateCareTaskStatusAction} className="d-inline-flex gap-2">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="taskId" value={task.id ?? ''} />
                              <input type="hidden" name="nextStatus" value="in-progress" />
                              <input type="hidden" name="taskVersionId" value={task.meta?.versionId ?? ''} />
                              <button type="submit" className="btn btn-sm btn-outline-primary">Start</button>
                            </form>
                            <form action={updateCareTaskStatusAction} className="d-inline-flex gap-2 ms-2">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="taskId" value={task.id ?? ''} />
                              <input type="hidden" name="nextStatus" value="completed" />
                              <input type="hidden" name="taskVersionId" value={task.meta?.versionId ?? ''} />
                              <button type="submit" className="btn btn-sm btn-outline-success">Done</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('notes-reports') && (
          <div className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Nursing and physiotherapy reports</h2></div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-lg-6">
                  <h3 className="h6">Nursing daily report</h3>
                  <form action={createNursingReportAction} className="row g-2">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-12"><label htmlFor="nursing-encounter" className="form-label">Linked visit</label><select id="nursing-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                    <div className="col-12">
                      <label htmlFor="nursing-summary" className="form-label">Condition summary</label>
                      <select id="nursing-summary" name="conditionSummary" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        {NURSING_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="nursing-escalation" className="form-label">Escalation needed</label><select id="nursing-escalation" name="escalationNeeded" className="form-select" defaultValue=""><option value="">Not set</option><option value="yes">Yes</option><option value="no">No</option></select></div>
                    <div className="col-12">
                      <label htmlFor="nursing-followup" className="form-label">Follow-up plan</label>
                      <select id="nursing-followup" name="followUpPlan" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        {PENDING_TASK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="nursing-note" className="form-label">Clinical note</label><textarea id="nursing-note" name="noteBody" rows={3} className="form-control" dir="auto" required /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save nursing report</button></div>
                  </form>
                </div>

                <div className="col-lg-6">
                  <h3 className="h6">Physiotherapy session report</h3>
                  <form action={createPhysioReportAction} className="row g-2">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-12"><label htmlFor="physio-encounter" className="form-label">Linked visit</label><select id="physio-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                    <div className="col-md-6"><label htmlFor="physio-template" className="form-label">Template</label><select id="physio-template" name="sessionTemplate" className="form-select" defaultValue="custom"><option value="post_op_knee">Post-op knee</option><option value="stroke_rehab">Stroke rehab</option><option value="low_back_pain">Low back pain</option><option value="geriatric_mobility">Geriatric mobility</option><option value="custom">Custom</option></select></div>
                    <div className="col-md-6"><label htmlFor="physio-session-number" className="form-label">Session number</label><input id="physio-session-number" name="sessionNumberLabel" className="form-control" placeholder="4 of 12" /></div>
                    <div className="col-12">
                      <label htmlFor="physio-subjective-function" className="form-label">Subjective function</label>
                      <select id="physio-subjective-function" name="subjectiveFunction" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Function improved since last session">Function improved since last session</option>
                        <option value="Function unchanged since last session">Function unchanged since last session</option>
                        <option value="Function declined since last session">Function declined since last session</option>
                        <option value="Patient reports easier transfers">Patient reports easier transfers</option>
                        <option value="Patient reports reduced walking tolerance">Patient reports reduced walking tolerance</option>
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="physio-objective-summary" className="form-label">Objective summary</label><textarea id="physio-objective-summary" name="objectiveSummary" rows={2} className="form-control" placeholder="ROM, balance, gait, or template-specific objective findings" dir="auto" /></div>
                    <div className="col-12">
                      <label htmlFor="physio-interventions" className="form-label">Interventions</label>
                      <select id="physio-interventions" name="interventions" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Therapeutic exercise and transfer training">Therapeutic exercise and transfer training</option>
                        <option value="Gait training and balance work">Gait training and balance work</option>
                        <option value="Range of motion and strengthening">Range of motion and strengthening</option>
                        <option value="Pain education and graded activity">Pain education and graded activity</option>
                        <option value="Family education and home safety review">Family education and home safety review</option>
                      </select>
                    </div>
                    <div className="col-6"><label htmlFor="physio-pain-before" className="form-label">Pain before</label><input id="physio-pain-before" name="painBefore" type="number" min="0" max="10" className="form-control" /></div>
                    <div className="col-6"><label htmlFor="physio-pain-after" className="form-label">Pain after</label><input id="physio-pain-after" name="painAfter" type="number" min="0" max="10" className="form-control" /></div>
                    <div className="col-12">
                      <label htmlFor="physio-response" className="form-label">Response summary</label>
                      <select id="physio-response" name="responseSummary" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Tolerated session well">Tolerated session well</option>
                        <option value="Tolerated with fatigue">Tolerated with fatigue</option>
                        <option value="Pain limited participation">Pain limited participation</option>
                        <option value="Required frequent rest breaks">Required frequent rest breaks</option>
                        <option value="Safety concern identified">Safety concern identified</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="physio-home-plan" className="form-label">Home plan</label>
                      <select id="physio-home-plan" name="homePlan" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Continue current home exercise plan">Continue current home exercise plan</option>
                        <option value="Progress home exercise plan">Progress home exercise plan</option>
                        <option value="Hold exercises pending review">Hold exercises pending review</option>
                        <option value="Family to supervise mobility practice">Family to supervise mobility practice</option>
                        <option value="Home safety modifications recommended">Home safety modifications recommended</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="physio-next-focus" className="form-label">Next session focus</label>
                      <select id="physio-next-focus" name="nextSessionFocus" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        {NEXT_SHIFT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="physio-discharge-readiness" className="form-label">Discharge readiness</label><select id="physio-discharge-readiness" name="dischargeReadiness" className="form-select" defaultValue=""><option value="">Not set</option><option value="not_yet">Not yet</option><option value="one_to_two_sessions">1-2 sessions</option><option value="ready">Ready</option></select></div>
                    <div className="col-12"><label htmlFor="physio-note" className="form-label">Clinical note</label><textarea id="physio-note" name="noteBody" rows={3} className="form-control" dir="auto" required /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save physio report</button></div>
                  </form>
                </div>
              </div>

              <hr className="my-4" />

              {careReportsError && <div className="alert alert-warning" role="alert">Could not load care reports: {careReportsError}</div>}
              {!careReportsError && careReports.length === 0 && <div className="alert alert-info mb-0" role="alert">No nursing or physio reports yet.</div>}
              {careReports.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Date</th><th>Type</th><th>Summary</th><th>Details</th><th>By</th></tr></thead>
                    <tbody>
                      {careReports.map((report) => {
                        const codeValue = reportCode(report);
                        const isNursing = codeValue === 'nursing-daily-report';
                        const isNursingHandoff = codeValue === 'nursing-shift-handoff';
                        const label = isNursing
                          ? 'Nursing'
                          : isNursingHandoff
                            ? 'Nursing Handoff'
                            : codeValue === 'physio-session-report'
                              ? 'Physio'
                              : codeValue;
                        const summary = isNursing
                          ? reportComponentText(report, 'condition-summary')
                          : isNursingHandoff
                            ? reportComponentText(report, 'patient-status-summary')
                            : reportComponentText(report, 'interventions');
                        const details = isNursing
                          ? reportComponentText(report, 'follow-up-plan')
                          : isNursingHandoff
                            ? [
                                `Shift ${reportComponentText(report, 'shift-start-at') ?? '—'} -> ${reportComponentText(report, 'shift-end-at') ?? '—'}`,
                                `Escalation: ${reportComponentText(report, 'escalation-status') ?? '—'}`,
                                `Next: ${reportComponentText(report, 'next-shift-focus') ?? '—'}`,
                              ].join(' | ')
                          : [
                              `Pain ${reportComponentText(report, 'pain-before') ?? '—'} -> ${reportComponentText(report, 'pain-after') ?? '—'}`,
                              reportComponentText(report, 'response-summary') ?? null,
                            ]
                              .filter(Boolean)
                              .join(' | ');

                        return (
                          <tr key={report.id}>
                            <td>{report.effectiveDateTime ? new Date(report.effectiveDateTime).toLocaleString('en-GB') : '—'}</td>
                            <td>{label}</td>
                            <td>{summary ?? report.note?.[0]?.text ?? '—'}</td>
                            <td>{details || '—'}</td>
                            <td>{report.performer?.[0]?.display ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
