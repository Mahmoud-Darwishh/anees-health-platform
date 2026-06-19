import 'server-only';

import { getMedplumClient } from './client';
import { MEDPLUM_CODE_SYSTEMS, FHIR_INTERPRETATION_SYSTEM } from './constants';

// Local copy of the risk severities (kept structurally identical to the catalog's
// `RiskSeverity`) so this lib module does not depend on the features layer.
type RiskSeverity = 'low' | 'moderate' | 'high';

function severityToInterpretationCode(severity: RiskSeverity): { code: string; display: string } {
  switch (severity) {
    case 'low':
      return { code: 'N', display: 'Normal' };
    case 'moderate':
      return { code: 'A', display: 'Abnormal' };
    case 'high':
      return { code: 'AA', display: 'Critically abnormal' };
  }
}

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = { system?: string; code?: string; display?: string };

const UCUM_SYSTEM = 'http://unitsofmeasure.org';
const ASSESSMENT_CATEGORY_CODE = 'assessment';

// ── Legacy QuestionnaireResponse (read-only, for history) ────────────────────

export type QuestionnaireResponseResource = {
  resourceType: 'QuestionnaireResponse';
  id?: string;
  meta?: { versionId?: string; lastUpdated?: string };
  status: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  questionnaire?: string;
  subject?: FhirReference;
  authored?: string;
  author?: FhirReference;
  encounter?: FhirReference;
  item?: Array<{
    linkId: string;
    text?: string;
    answer?: Array<{ valueString?: string; valueInteger?: number }>;
  }>;
};

// ── Coded assessment Observation (the Phase 4 storage) ───────────────────────

type AssessmentObservationResource = {
  resourceType: 'Observation';
  id?: string;
  status: 'final';
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject?: FhirReference;
  encounter?: FhirReference;
  performer?: FhirReference[];
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  interpretation?: Array<{ coding?: FhirCoding[]; text?: string }>;
  note?: Array<{ text?: string }>;
  component?: Array<{ code?: { coding?: FhirCoding[] }; valueString?: string }>;
};

export type AssessmentSummary = {
  id: string;
  title: string;
  type: string;
  score?: number;
  unit?: string;
  /** Risk band label (e.g. "High fall risk"), when a validated instrument was used. */
  band?: string;
  severity?: RiskSeverity;
  /** Anees instrument code (e.g. `braden`), when validated. */
  instrument?: string;
  summary?: string;
  authored?: string;
  author?: string;
};

export type CreateAssessmentInput = {
  patientId: string;
  title: string;
  assessmentType: 'functional' | 'mobility' | 'pain' | 'other';
  score?: number | null;
  summary: string;
  notes?: string | null;
  encounterId?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
  // Validated-instrument fields (omitted for free-text assessments):
  instrumentCode?: string | null;
  instrumentLoinc?: string | null;
  unit?: string | null;
  bandLabel?: string | null;
  bandSeverity?: RiskSeverity | null;
};

function riskSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function reportComponent(code: string, display: string, value: string): NonNullable<AssessmentObservationResource['component']>[number] {
  return { code: { coding: [{ system: MEDPLUM_CODE_SYSTEMS.reportType, code, display }] }, valueString: value };
}

export async function createPatientAssessment(input: CreateAssessmentInput): Promise<AssessmentObservationResource> {
  const medplum = await getMedplumClient();

  const coding: FhirCoding[] = input.instrumentCode
    ? [{ system: MEDPLUM_CODE_SYSTEMS.assessmentInstrument, code: input.instrumentCode, display: input.title }]
    : [{ system: MEDPLUM_CODE_SYSTEMS.assessmentInstrument, code: 'free-text', display: input.title }];
  if (input.instrumentLoinc) {
    coding.push({ system: MEDPLUM_CODE_SYSTEMS.loinc, code: input.instrumentLoinc, display: input.title });
  }

  const interpretation =
    input.bandLabel && input.bandSeverity
      ? [
          {
            coding: [
              { system: FHIR_INTERPRETATION_SYSTEM, ...severityToInterpretationCode(input.bandSeverity) },
              { system: MEDPLUM_CODE_SYSTEMS.assessmentRisk, code: riskSlug(input.bandLabel), display: input.bandLabel },
            ],
            text: input.bandLabel,
          },
        ]
      : undefined;

  const components = [
    reportComponent('assessment-type', 'Assessment Type', input.assessmentType),
    reportComponent('assessment-summary', 'Assessment Summary', input.summary),
  ];

  return (await medplum.createResource({
    resourceType: 'Observation',
    status: 'final',
    category: [
      { coding: [{ system: MEDPLUM_CODE_SYSTEMS.observationCategory, code: 'survey', display: 'Survey' }] },
      { coding: [{ system: MEDPLUM_CODE_SYSTEMS.aneesObservationCategory, code: ASSESSMENT_CATEGORY_CODE, display: 'Assessment' }] },
    ],
    code: { coding, text: input.title },
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    performer: input.recordedByReference
      ? [{ reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }]
      : undefined,
    effectiveDateTime: new Date().toISOString(),
    valueQuantity:
      typeof input.score === 'number'
        ? { value: input.score, unit: input.unit ?? '{score}', system: UCUM_SYSTEM, code: input.unit ?? '{score}' }
        : undefined,
    interpretation,
    component: components,
    note: input.notes ? [{ text: input.notes }] : undefined,
  } as never)) as AssessmentObservationResource;
}

const V3_TO_SEVERITY: Record<string, RiskSeverity> = { N: 'low', A: 'moderate', AA: 'high' };

function componentValue(resource: AssessmentObservationResource, code: string): string | undefined {
  return resource.component?.find((entry) => entry.code?.coding?.[0]?.code === code)?.valueString;
}

function normalizeAssessmentObservation(resource: AssessmentObservationResource): AssessmentSummary | null {
  if (!resource.id) return null;

  const instrumentCoding = (resource.code?.coding ?? []).find(
    (coding) => coding.system === MEDPLUM_CODE_SYSTEMS.assessmentInstrument,
  );
  const v3 = (resource.interpretation?.[0]?.coding ?? []).find((coding) => coding.system === FHIR_INTERPRETATION_SYSTEM);

  return {
    id: resource.id,
    title: resource.code?.text ?? instrumentCoding?.display ?? 'Assessment',
    type: componentValue(resource, 'assessment-type') ?? 'other',
    score: typeof resource.valueQuantity?.value === 'number' ? resource.valueQuantity.value : undefined,
    unit: resource.valueQuantity?.unit,
    band: resource.interpretation?.[0]?.text ?? resource.interpretation?.[0]?.coding?.[0]?.display,
    severity: v3?.code ? V3_TO_SEVERITY[v3.code] : undefined,
    instrument: instrumentCoding?.code && instrumentCoding.code !== 'free-text' ? instrumentCoding.code : undefined,
    summary: componentValue(resource, 'assessment-summary'),
    authored: resource.effectiveDateTime,
    author: resource.performer?.[0]?.display ?? resource.performer?.[0]?.reference,
  };
}

function pickAnswer(items: QuestionnaireResponseResource['item'], linkId: string) {
  return items?.find((entry) => entry.linkId === linkId)?.answer?.[0];
}

function normalizeLegacyAssessment(resource: QuestionnaireResponseResource): AssessmentSummary | null {
  if (!resource.id) return null;
  return {
    id: resource.id,
    title: pickAnswer(resource.item, 'assessment-title')?.valueString ?? 'Assessment',
    type: pickAnswer(resource.item, 'assessment-type')?.valueString ?? 'other',
    score: pickAnswer(resource.item, 'assessment-score')?.valueInteger,
    summary: pickAnswer(resource.item, 'assessment-summary')?.valueString,
    authored: resource.authored,
    author: resource.author?.display ?? resource.author?.reference,
  };
}

/**
 * Reads coded assessment Observations (Phase 4) AND legacy QuestionnaireResponses
 * (so historical assessments still surface), merged newest-first.
 */
export async function listPatientAssessments(patientId: string, count = 50): Promise<AssessmentSummary[]> {
  const medplum = await getMedplumClient();

  const [observations, legacy] = await Promise.all([
    medplum.searchResources('Observation', {
      subject: `Patient/${patientId}`,
      category: `${MEDPLUM_CODE_SYSTEMS.aneesObservationCategory}|${ASSESSMENT_CATEGORY_CODE}`,
      _count: String(count),
      _sort: '-date',
    }) as Promise<AssessmentObservationResource[]>,
    medplum.searchResources('QuestionnaireResponse', {
      subject: `Patient/${patientId}`,
      _count: String(count),
      _sort: '-_lastUpdated',
    }) as Promise<QuestionnaireResponseResource[]>,
  ]);

  const merged = [
    ...observations.map(normalizeAssessmentObservation),
    ...legacy.map(normalizeLegacyAssessment),
  ].filter((item): item is AssessmentSummary => !!item);

  return merged
    .sort((a, b) => new Date(b.authored ?? 0).getTime() - new Date(a.authored ?? 0).getTime())
    .slice(0, count);
}
