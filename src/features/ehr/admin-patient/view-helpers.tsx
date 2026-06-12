import type { AdminPatientDetailData } from './types';

export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024;

export const CONDITION_CONTEXT_OPTIONS = [
  'New diagnosis during this episode',
  'Known chronic condition under routine follow-up',
  'Stable with current plan',
  'Worsening; escalation pathway activated',
  'Improving with current treatment and rehab plan',
] as const;

export const CONDITION_STATUS_OPTIONS = ['active', 'resolved', 'inactive', 'remission'] as const;

export const ALLERGY_STATUS_OPTIONS = ['active', 'inactive', 'resolved'] as const;

// Free-text allergens with a small convenience list of common ones (datalist).
export const COMMON_ALLERGENS = [
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


export const MEDICATION_ROUTE_OPTIONS = ['Oral', 'Sublingual', 'Subcutaneous', 'Intramuscular', 'Intravenous', 'Topical', 'Inhaled', 'Rectal', 'Ophthalmic', 'Otic'] as const;

export const MEDICATION_MANAGE_STATUS_OPTIONS = ['active', 'on-hold', 'completed', 'stopped'] as const;

// Duration options auto-calculate the medication end date from the start date.
export const MEDICATION_DURATION_OPTIONS = [
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
export const COMMON_MEDICATIONS = [
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

export const MEDICATION_FREQUENCY_OPTIONS = [
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


export const MAR_REASON_OPTIONS = [
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


export const ASSESSMENT_OPTIONS = [
  { title: 'Falls risk screen', type: 'mobility', summary: 'Falls risk reviewed; prevention plan updated.' },
  { title: 'Braden pressure injury risk', type: 'functional', summary: 'Skin risk reviewed; repositioning and skin-care plan updated.' },
  { title: 'Pain reassessment', type: 'pain', summary: 'Pain score reviewed with response to current plan.' },
  { title: 'Mobility and gait review', type: 'mobility', summary: 'Mobility reviewed with transfer and gait safety recommendations.' },
  { title: 'ADL functional review', type: 'functional', summary: 'ADL support level reviewed and care plan updated.' },
  { title: 'Cognitive status screen', type: 'functional', summary: 'Cognitive status reviewed; safety supervision needs updated.' },
  { title: 'Wound risk review', type: 'other', summary: 'Wound status/risk reviewed and follow-up plan updated.' },
] as const;

export const NURSING_STATUS_OPTIONS = [
  'Stable; no acute change this shift',
  'Improving compared with prior shift',
  'Requires close monitoring',
  'New symptom reported',
  'Deterioration suspected',
  'Post-procedure monitoring',
] as const;

export const PENDING_TASK_OPTIONS = [
  'No pending clinical tasks',
  'Medication administration due next shift',
  'Vitals monitoring due next shift',
  'Wound care/dressing due next shift',
  'Family update pending',
  'Lab or imaging follow-up pending',
  'Escalation follow-up pending',
] as const;

export const MEDICATION_SAFETY_OPTIONS = [
  'No medication safety issues this shift',
  'MAR complete for this shift',
  'Medication refused/held; see MAR',
  'Medication supply issue',
  'High-alert medication requires double-check',
  'Adverse reaction monitoring required',
] as const;

export const NEXT_SHIFT_FOCUS_OPTIONS = [
  'Routine monitoring',
  'Vitals trend and escalation watch',
  'Medication adherence and MAR completion',
  'Skin integrity and repositioning',
  'Mobility/falls prevention',
  'Nutrition and hydration',
  'Family education and reassurance',
] as const;

export const TASK_TITLE_OPTIONS = [
  'Lab follow-up',
  'Medication reconciliation',
  'Family update',
  'Care plan review',
  'Wound care follow-up',
  'Vitals trend review',
  'Insurance/prior authorization follow-up',
  'Hospital handoff preparation',
] as const;

export const TASK_DESCRIPTION_OPTIONS = [
  'Confirm completion and document outcome.',
  'Call family and document response.',
  'Review with supervising clinician.',
  'Coordinate next visit requirement.',
  'Escalate if not completed before due date.',
] as const;

export const INCIDENT_ACTION_OPTIONS = [
  'Patient assessed and stabilized',
  'Vitals checked',
  'Family notified',
  'Physician/medical ops notified',
  'Environment made safe',
  'Medication held pending review',
  'Escalation task created',
] as const;

export const VISIT_NOTE_OPTIONS = [
  'Routine home visit',
  'Medication review performed',
  'Vitals and safety review performed',
  'Wound care visit',
  'Physiotherapy session',
  'Post-discharge follow-up',
  'Family education provided',
] as const;

export const COMMUNICATION_MESSAGE_OPTIONS = [
  'Clinical update documented; no action required.',
  'Family update requested.',
  'Medication concern requires review.',
  'Vitals trend requires review.',
  'Visit schedule requires coordination.',
  'Care plan review requested.',
  'Hospital handoff coordination required.',
] as const;

export const ESCALATION_TITLE_OPTIONS = [
  'Respiratory deterioration',
  'Abnormal vital signs',
  'Medication safety issue',
  'Fall or injury concern',
  'Pressure injury concern',
  'Family escalation',
  'Missed visit or access issue',
  'Hospital transfer consideration',
] as const;

export const ESCALATION_SUMMARY_OPTIONS = [
  'Requires urgent clinician review and documented next action.',
  'Requires medical ops follow-up before next scheduled visit.',
  'Requires family contact and safety-plan confirmation.',
  'Requires medication review before next dose.',
  'Requires hospital-partner coordination.',
] as const;

export const APPOINTMENT_NOTE_OPTIONS = [
  'Routine scheduled visit',
  'Medication administration visit',
  'Vitals monitoring visit',
  'Wound care visit',
  'Physiotherapy session',
  'Post-discharge follow-up',
  'Family teaching visit',
] as const;

export const TEMPORARILY_AWAY_OPTIONS = [
  'Patient is temporarily staying with family',
  'Patient is hospitalized temporarily',
  'Patient is traveling temporarily',
  'Temporary address pending confirmation',
] as const;

// Workspace-tab definitions + resolution live in ./workspace-tabs (shared with the loader).

export function getPatientHomeAddress(patient: AdminPatientDetailData['patient']) {
  return patient?.address?.find((address: { use?: string }) => address.use === 'home') ?? patient?.address?.[0] ?? null;
}

export function getAddressMapUrl(address: ReturnType<typeof getPatientHomeAddress>): string | null {
  return (
    address?.extension?.find((extension: { url: string; valueUrl?: string }) => extension.url === 'https://anees.health/fhir/StructureDefinition/address-map-url')
      ?.valueUrl ?? null
  );
}

export function communicationCategoryLabel(category: string): string {
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

export function appointmentStatusLabel(status: string): string {
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

export function workflowStateLabel(state: string): string {
  return state
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatClinicalDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString('en-GB');
}

export function carePlanStatusBadgeClass(status: string): string {
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

export function goalStatusBadgeClass(status: string): string {
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

export function goalStatusLabel(status: string): string {
  return workflowStateLabel(status);
}

