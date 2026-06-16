export const MEDPLUM_CODE_SYSTEMS = {
  patientCode: 'https://anees.health/fhir/identifier/patient-code',
  staffId: 'https://anees.health/fhir/identifier/staff-id',
  staffRole: 'https://anees.health/fhir/staff-role',
  caregiverPhone: 'https://anees.health/fhir/identifier/caregiver-phone',
  caregiverEmail: 'https://anees.health/fhir/identifier/caregiver-email',
  encounterType: 'https://anees.health/fhir/encounter-type',
  taskType: 'https://anees.health/fhir/task-type',
  communicationType: 'https://anees.health/fhir/communication-type',
  patientGoalId: 'https://anees.health/fhir/identifier/patient-goal-id',
  visitId: 'https://anees.health/fhir/identifier/visit-id',
  reportType: 'https://anees.health/fhir/report-type',
  careTeamCategory: 'https://anees.health/fhir/care-team-category',
  clinicalNoteType: 'https://anees.health/fhir/document-type',
  documentCategory: 'https://anees.health/fhir/document-category',
  icd10: 'http://hl7.org/fhir/sid/icd-10',
  snomed: 'http://snomed.info/sct',
  rxnorm: 'http://www.nlm.nih.gov/research/umls/rxnorm',
  v3ActCode: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  loinc: 'http://loinc.org',
  observationCategory: 'http://terminology.hl7.org/CodeSystem/observation-category',
} as const;

export const MEDPLUM_EXTENSION_URLS = {
  caregiverPhone: 'https://anees.health/fhir/extension/caregiver-phone',
  caregiverEmail: 'https://anees.health/fhir/extension/caregiver-email',
  portalScope: 'https://anees.health/fhir/extension/portal-scope',
  glucoseTiming: 'https://anees.health/fhir/extension/glucose-timing',
  glucoseMeal: 'https://anees.health/fhir/extension/glucose-meal',
} as const;

export const FHIR_INTERPRETATION_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation';

const RESTRICTED_TIER_SECURITY_CODES = new Set(['r', 'v', 'psy', 'eth']);
const RESTRICTED_TIER_CODE_HINTS = new Set([
  'hiv',
  'sti',
  'std',
  'mental-health',
  'psychiatry',
  'behavioral-health',
  'reproductive-health',
  'sexual-health',
  'substance-use',
  'domestic-violence',
  'consent',
  'insurance',
]);

type FhirCodingLike = {
  system?: string;
  code?: string;
  display?: string;
};

export function isRestrictedTierSecurityCoding(coding: FhirCodingLike | null | undefined): boolean {
  const code = coding?.code?.trim().toLowerCase();
  if (!code) {
    return false;
  }
  return RESTRICTED_TIER_SECURITY_CODES.has(code);
}

export function isRestrictedTierClinicalCoding(coding: FhirCodingLike | null | undefined): boolean {
  const code = coding?.code?.trim().toLowerCase();
  if (!code) {
    return false;
  }

  if (RESTRICTED_TIER_CODE_HINTS.has(code)) {
    return true;
  }

  for (const hint of RESTRICTED_TIER_CODE_HINTS) {
    if (code.includes(hint)) {
      return true;
    }
  }

  return false;
}
