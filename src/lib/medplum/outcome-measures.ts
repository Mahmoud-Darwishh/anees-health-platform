import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

/**
 * Discrete, coded outcome-measure Observations.
 *
 * Physio/nursing session reports historically buried every score (Berg, TUG,
 * pain before/after, ROM, …) as `component` slices inside ONE survey Observation
 * keyed by Anees-local codes — not individually queryable or trendable by a
 * standard FHIR consumer. This module promotes each measure to its **own
 * `Observation`** with a stable code (LOINC where one exists, plus an Anees
 * outcome code), a real `valueQuantity` + UCUM unit, and a `derivedFrom` link
 * back to the parent report. The parent report keeps a `hasMember` reference to
 * the children, so it is a wrapper that *references* the measures rather than
 * embedding them.
 *
 * The result: a hospital partner (or our own trend reader,
 * `listPatientOutcomeMeasures`) can pull "every Berg score for this patient over
 * time" with a single standards-based search.
 *
 * Measure keys here are stable; the values come from the physio report input.
 */

const UCUM_SYSTEM = 'http://unitsofmeasure.org';
const OUTCOME_CATEGORY_CODE = 'outcome-measure';

type FhirReference = { reference?: string; display?: string };

type ObservationCategoryKind = 'survey' | 'activity' | 'exam';

type OutcomeMeasureDef = {
  /** Stable Anees outcome code (within `MEDPLUM_CODE_SYSTEMS.outcomeMeasure`). */
  code: string;
  display: string;
  /** UCUM unit code (also used as the human unit; `{score}` for unit-less scores). */
  unit: string;
  /** Optional LOINC code added as a secondary coding for interoperability. */
  loinc?: string;
  category: ObservationCategoryKind;
};

/**
 * The outcome-measure registry, keyed by the field key the physio report uses.
 * Add a row here to make a new measure trendable; no other change needed.
 */
export const OUTCOME_MEASURES = {
  pain_before: { code: 'pain-pre', display: 'Pain before session (NRS 0–10)', unit: '{score}', loinc: '72514-3', category: 'survey' },
  pain_after: { code: 'pain-post', display: 'Pain after session (NRS 0–10)', unit: '{score}', loinc: '72514-3', category: 'survey' },
  tug_seconds: { code: 'tug', display: 'Timed Up and Go', unit: 's', category: 'activity' },
  berg: { code: 'berg', display: 'Berg Balance Scale (total)', unit: '{score}', category: 'survey' },
  tinetti: { code: 'tinetti', display: 'Tinetti POMA (total)', unit: '{score}', category: 'survey' },
  ashworth: { code: 'ashworth', display: 'Modified Ashworth Scale', unit: '{score}', category: 'exam' },
  functional_reach_cm: { code: 'functional-reach', display: 'Functional Reach', unit: 'cm', category: 'activity' },
  slr_left_deg: { code: 'slr-left', display: 'Straight Leg Raise (left)', unit: 'deg', category: 'exam' },
  slr_right_deg: { code: 'slr-right', display: 'Straight Leg Raise (right)', unit: 'deg', category: 'exam' },
  schober_cm: { code: 'schober', display: 'Modified Schober', unit: 'cm', category: 'exam' },
  knee_flexion_deg: { code: 'knee-flexion-rom', display: 'Knee flexion ROM', unit: 'deg', category: 'exam' },
  knee_extension_deg: { code: 'knee-extension-rom', display: 'Knee extension ROM', unit: 'deg', category: 'exam' },
} as const satisfies Record<string, OutcomeMeasureDef>;

export type OutcomeMeasureKey = keyof typeof OUTCOME_MEASURES;

export type OutcomeMeasureInput = {
  key: OutcomeMeasureKey;
  value: number;
};

export type CreateOutcomeObservationsInput = {
  patientId: string;
  encounterId?: string | null;
  performerReference?: string | null;
  performerDisplay?: string | null;
  recordedAt: Date;
  /** Parent report this measure was derived from (sets `derivedFrom`). */
  parentReportId?: string | null;
  measures: OutcomeMeasureInput[];
};

type OutcomeObservationResource = {
  resourceType: 'Observation';
  id?: string;
  status: 'final';
  category: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  code: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string };
  subject: FhirReference;
  encounter?: FhirReference;
  performer?: FhirReference[];
  effectiveDateTime: string;
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  derivedFrom?: FhirReference[];
};

function categoryDisplay(kind: ObservationCategoryKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * Pure builder for a single discrete outcome Observation. Exported for testing —
 * given a measure key + value + context it returns a FHIR-valid Observation with
 * the right code (Anees + optional LOINC), UCUM-quantified value, dual category,
 * and parent linkage. No I/O.
 */
export function buildOutcomeObservation(
  key: OutcomeMeasureKey,
  value: number,
  ctx: Omit<CreateOutcomeObservationsInput, 'measures'>,
): OutcomeObservationResource {
  const def: OutcomeMeasureDef = OUTCOME_MEASURES[key];
  const coding: Array<{ system: string; code: string; display: string }> = [
    { system: MEDPLUM_CODE_SYSTEMS.outcomeMeasure, code: def.code, display: def.display },
  ];
  if (def.loinc) {
    coding.push({ system: MEDPLUM_CODE_SYSTEMS.loinc, code: def.loinc, display: def.display });
  }

  return {
    resourceType: 'Observation',
    status: 'final',
    category: [
      { coding: [{ system: MEDPLUM_CODE_SYSTEMS.observationCategory, code: def.category, display: categoryDisplay(def.category) }] },
      { coding: [{ system: MEDPLUM_CODE_SYSTEMS.aneesObservationCategory, code: OUTCOME_CATEGORY_CODE, display: 'Outcome Measure' }] },
    ],
    code: { coding, text: def.display },
    subject: { reference: `Patient/${ctx.patientId}` },
    encounter: ctx.encounterId ? { reference: `Encounter/${ctx.encounterId}` } : undefined,
    performer: ctx.performerReference
      ? [{ reference: ctx.performerReference, display: ctx.performerDisplay ?? undefined }]
      : undefined,
    effectiveDateTime: ctx.recordedAt.toISOString(),
    valueQuantity: { value, unit: def.unit, system: UCUM_SYSTEM, code: def.unit },
    derivedFrom: ctx.parentReportId ? [{ reference: `Observation/${ctx.parentReportId}` }] : undefined,
  };
}

type FhirBundle = {
  resourceType: 'Bundle';
  type: 'transaction';
  entry?: Array<{
    resource?: OutcomeObservationResource;
    request?: { method: 'POST'; url: 'Observation' };
    response?: { status?: string };
  }>;
};

/**
 * Create the discrete outcome Observations for a report in one transaction
 * bundle. Returns the created child references (for the parent's `hasMember`).
 * Skips measures with a non-finite value or unknown key.
 */
export async function createOutcomeObservations(
  input: CreateOutcomeObservationsInput,
): Promise<FhirReference[]> {
  const resources = input.measures
    .filter((measure) => Number.isFinite(measure.value) && measure.key in OUTCOME_MEASURES)
    .map((measure) => buildOutcomeObservation(measure.key, measure.value, input));

  if (resources.length === 0) {
    return [];
  }

  const medplum = await getMedplumClient();
  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: resources.map((resource) => ({ resource, request: { method: 'POST', url: 'Observation' } })),
  };

  const response = (await medplum.executeBatch(bundle as never)) as FhirBundle;
  return (response.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is OutcomeObservationResource => !!resource?.id)
    .map((resource) => ({ reference: `Observation/${resource.id}` }));
}

// ── Trend reader ─────────────────────────────────────────────────────────────

export type OutcomeMeasureTrend = {
  code: string;
  display: string;
  unit: string;
  latest: { value: number; date: string } | null;
  points: Array<{ value: number; date: string }>;
};

type SearchObservation = {
  id?: string;
  effectiveDateTime?: string;
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string };
  valueQuantity?: { value?: number; unit?: string };
};

/**
 * Trend reader — returns the patient's discrete outcome measures grouped by code,
 * newest-first, with the latest value highlighted. This is the interoperable
 * read the dashboards (and a hospital partner) can use instead of parsing the
 * survey-report components.
 */
export async function listPatientOutcomeMeasures(
  patientId: string,
  options?: { daysBack?: number; count?: number },
): Promise<OutcomeMeasureTrend[]> {
  const medplum = await getMedplumClient();
  const daysBack = options?.daysBack ?? 180;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const rows = (await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    category: `${MEDPLUM_CODE_SYSTEMS.aneesObservationCategory}|${OUTCOME_CATEGORY_CODE}`,
    date: `ge${since.toISOString().slice(0, 10)}`,
    _count: String(options?.count ?? 300),
    _sort: '-date',
  })) as SearchObservation[];

  const byCode = new Map<string, OutcomeMeasureTrend>();

  for (const row of rows) {
    const coding = (row.code?.coding ?? []).find((c) => c.system === MEDPLUM_CODE_SYSTEMS.outcomeMeasure);
    const value = row.valueQuantity?.value;
    if (!coding?.code || typeof value !== 'number' || !row.effectiveDateTime) {
      continue;
    }

    const existing = byCode.get(coding.code) ?? {
      code: coding.code,
      display: coding.display ?? row.code?.text ?? coding.code,
      unit: row.valueQuantity?.unit ?? '',
      latest: null,
      points: [],
    };
    existing.points.push({ value, date: row.effectiveDateTime });
    byCode.set(coding.code, existing);
  }

  // Search is newest-first; the first point per code is therefore the latest.
  for (const trend of byCode.values()) {
    trend.latest = trend.points[0] ?? null;
  }

  return [...byCode.values()].sort((a, b) => a.display.localeCompare(b.display));
}
