export const ANEES_FHIR_EXTENSION_BASE = 'https://anees.health/fhir/StructureDefinition';

export const EgyptianExtensions = {
  nationalId: `${ANEES_FHIR_EXTENSION_BASE}/national-id`,
  governorate: `${ANEES_FHIR_EXTENSION_BASE}/governorate`,
  district: `${ANEES_FHIR_EXTENSION_BASE}/district`,
  caregiverRelationshipDetail: `${ANEES_FHIR_EXTENSION_BASE}/caregiver-relationship-detail`,
  careProgram: `${ANEES_FHIR_EXTENSION_BASE}/care-program`,
} as const;

export type CareProgramCode = 'sanad' | 'haraka' | 'wai' | 'amal';

export const CARE_PROGRAM_SYSTEM = 'https://anees.health/fhir/CodeSystem/care-program';

export const CareProgramCoding: Record<CareProgramCode, { code: string; display: string }> = {
  sanad: { code: 'sanad', display: 'Sanad' },
  haraka: { code: 'haraka', display: 'Haraka' },
  wai: { code: 'wai', display: "Wa'i" },
  amal: { code: 'amal', display: 'Amal' },
};
