import type { getMedplumPatient } from '@/lib/medplum/patients';
import type { listPatientEncounters } from '@/lib/medplum/encounters';
import type { listRecentPatientVitals } from '@/lib/medplum/observations';
import type { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import type { getActivePatientCareTeam } from '@/lib/medplum/care-teams';
import type { listPatientTasks } from '@/lib/medplum/tasks';
import type { listPatientCareReports } from '@/lib/medplum/care-reports';
import type { PortalConsentSummary } from '@/lib/medplum/consents';
import type { AllergySummary } from '@/lib/medplum/allergies';
import type { ConditionSummary } from '@/lib/medplum/conditions';
import type { MedicationSummary } from '@/lib/medplum/medications';
import type { DocumentSummary } from '@/lib/medplum/documents';
import type { LabOrderSummary, LabResultSummary } from '@/lib/medplum/labs';
import type { AssessmentSummary } from '@/lib/medplum/assessments';
import type { CommunicationSummary } from '@/lib/medplum/communications';
import type { AppointmentSummary } from '@/lib/medplum/appointments';

export type AssignableStaff = {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'operator' | 'doctor' | 'physiotherapist' | 'nurse' | 'finance' | 'viewer';
};

export type AdminPatientFlash = {
  type: 'success' | 'error';
  message: string;
};

export type AdminPatientDetailData = {
  patient: Awaited<ReturnType<typeof getMedplumPatient>> | null;
  localPatient: {
    id: string;
    code: string;
    primaryCaregiverPhone: string | null;
    primaryCaregiverEmail: string | null;
  } | null;
  error: string | null;
  encounters: Awaited<ReturnType<typeof listPatientEncounters>>;
  encountersError: string | null;
  vitals: Awaited<ReturnType<typeof listRecentPatientVitals>>;
  vitalsError: string | null;
  clinicalNotes: Awaited<ReturnType<typeof listPatientClinicalNotes>>;
  clinicalNotesError: string | null;
  careTeam: Awaited<ReturnType<typeof getActivePatientCareTeam>>;
  careTeamError: string | null;
  assignableStaff: AssignableStaff[];
  tasks: Awaited<ReturnType<typeof listPatientTasks>>;
  tasksError: string | null;
  careReports: Awaited<ReturnType<typeof listPatientCareReports>>;
  careReportsError: string | null;
  conditions: ConditionSummary[];
  conditionsError: string | null;
  allergies: AllergySummary[];
  allergiesError: string | null;
  medications: MedicationSummary[];
  medicationsError: string | null;
  documents: DocumentSummary[];
  documentsError: string | null;
  labOrders: LabOrderSummary[];
  labOrdersError: string | null;
  labResults: LabResultSummary[];
  labResultsError: string | null;
  assessments: AssessmentSummary[];
  assessmentsError: string | null;
  communications: CommunicationSummary[];
  communicationsError: string | null;
  appointments: AppointmentSummary[];
  appointmentsError: string | null;
  caregiverConsents: PortalConsentSummary[];
  caregiverConsentsError: string | null;
};
