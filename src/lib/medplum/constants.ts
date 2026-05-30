export const MEDPLUM_CODE_SYSTEMS = {
  patientCode: 'https://anees.health/fhir/identifier/patient-code',
  staffId: 'https://anees.health/fhir/identifier/staff-id',
  staffRole: 'https://anees.health/fhir/staff-role',
  caregiverPhone: 'https://anees.health/fhir/identifier/caregiver-phone',
  caregiverEmail: 'https://anees.health/fhir/identifier/caregiver-email',
  encounterType: 'https://anees.health/fhir/encounter-type',
  taskType: 'https://anees.health/fhir/task-type',
  communicationType: 'https://anees.health/fhir/communication-type',
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
} as const;
