export const ANEES_FHIR_EXTENSION_BASE = 'https://anees.health/fhir/StructureDefinition';

export const EgyptianExtensions = {
  nationalId: `${ANEES_FHIR_EXTENSION_BASE}/national-id`,
  governorate: `${ANEES_FHIR_EXTENSION_BASE}/governorate`,
  district: `${ANEES_FHIR_EXTENSION_BASE}/district`,
  addressMapUrl: `${ANEES_FHIR_EXTENSION_BASE}/address-map-url`,
  caregiverRelationshipDetail: `${ANEES_FHIR_EXTENSION_BASE}/caregiver-relationship-detail`,
  careProgram: `${ANEES_FHIR_EXTENSION_BASE}/care-program`,
  clinicalNoteText: `${ANEES_FHIR_EXTENSION_BASE}/clinical-note-text`,
  clinicalNoteDiscipline: `${ANEES_FHIR_EXTENSION_BASE}/clinical-note-discipline`,
  clinicalNoteSignedAt: `${ANEES_FHIR_EXTENSION_BASE}/clinical-note-signed-at`,
  clinicalNoteAmends: `${ANEES_FHIR_EXTENSION_BASE}/clinical-note-amends`,
} as const;

export type CareProgramCode = 'sanad' | 'haraka' | 'wai' | 'amal';

export const CARE_PROGRAM_SYSTEM = 'https://anees.health/fhir/CodeSystem/care-program';

export const CareProgramCoding: Record<CareProgramCode, { code: string; display: string }> = {
  sanad: { code: 'sanad', display: 'Sanad' },
  haraka: { code: 'haraka', display: 'Haraka' },
  wai: { code: 'wai', display: "Wa'i" },
  amal: { code: 'amal', display: 'Amal' },
};
