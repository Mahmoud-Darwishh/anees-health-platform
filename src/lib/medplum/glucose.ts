import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import {
  MEDPLUM_CODE_SYSTEMS,
  MEDPLUM_EXTENSION_URLS,
  FHIR_INTERPRETATION_SYSTEM,
} from '@/lib/medplum/constants';
import {
  classifyGlucose,
  glucoseInterpretationCode,
  type GlucoseMeal,
  type GlucoseTiming,
  GLUCOSE_TIMING_VALUES,
  GLUCOSE_MEAL_VALUES,
} from '@/lib/clinical/glucose-profile';

/**
 * Blood-glucose readings, stored as FHIR Observations.
 *
 * Glucose is ONE stream, not two: every reading — whether a quick entry from the
 * vitals form or a context-rich entry from the glucose recorder — uses the standard
 * blood-glucose code LOINC 2339-0 in the `vital-signs` category. A glucose is a
 * normal vital. The only thing the recorder adds is OPTIONAL meal-timing context
 * (fasting / pre-meal / post-meal / bedtime / …), carried as a structured extension
 * because FHIR has no standard element for it. Readings without that context are
 * still first-class members of the profile — they're placed in the logbook by their
 * time of day (see `@/lib/clinical/glucose-profile`).
 *
 * The value is ALWAYS canonical mg/dL (see `@/lib/clinical/glucose-units`). An
 * interpretation flag (L / LL / H / HH / N) is derived from the timing-aware
 * classification and stored on the resource so consumers see severity directly.
 */

const GLUCOSE_LOINC = '2339-0';
const GLUCOSE_DISPLAY = 'Glucose [Mass/volume] in Blood';
// Readings written by the earlier (separate-stream) design used the capillary
// glucometer code; the reader still includes it so no historical data is lost.
const LEGACY_GLUCOMETER_LOINC = '41653-7';

type FhirCoding = { system?: string; code?: string; display?: string };

type MedplumGlucoseObservation = {
  resourceType: 'Observation';
  id?: string;
  status: 'final';
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject: { reference?: string; display?: string };
  encounter?: { reference?: string };
  performer?: Array<{ reference?: string; display?: string }>;
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  interpretation?: Array<{ coding?: FhirCoding[] }>;
  method?: { text?: string };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url?: string; valueCode?: string }>;
};

export type CreateGlucoseReadingInput = {
  patientId: string;
  encounterId?: string | null;
  performerReference?: string | null;
  performerDisplay?: string | null;
  recordedAt: Date;
  /** Canonical mg/dL — caller must convert any entered mmol/L before reaching here. */
  valueMgDl: number;
  timing: GlucoseTiming;
  meal?: GlucoseMeal | null;
  symptomatic?: boolean | null;
  treatmentGiven?: string | null;
  note?: string | null;
};

export type GlucoseReadingRow = {
  id: string | null;
  measuredAt: string;
  valueMgDl: number;
  timing: GlucoseTiming;
  meal: GlucoseMeal | null;
  interpretationCode: string | null;
  performer: string | null;
  encounterId: string | null;
  note: string | null;
};

function isGlucoseTiming(value: string | undefined): value is GlucoseTiming {
  return !!value && (GLUCOSE_TIMING_VALUES as readonly string[]).includes(value);
}

function isGlucoseMeal(value: string | undefined): value is GlucoseMeal {
  return !!value && (GLUCOSE_MEAL_VALUES as readonly string[]).includes(value);
}

export async function createGlucoseReading(
  input: CreateGlucoseReadingInput,
): Promise<MedplumGlucoseObservation> {
  const medplum = await getMedplumClient();

  const category = classifyGlucose(input.valueMgDl, input.timing);
  const interpretation = glucoseInterpretationCode(category);

  const extension: NonNullable<MedplumGlucoseObservation['extension']> = [
    { url: MEDPLUM_EXTENSION_URLS.glucoseTiming, valueCode: input.timing },
  ];
  if (input.meal) {
    extension.push({ url: MEDPLUM_EXTENSION_URLS.glucoseMeal, valueCode: input.meal });
  }

  const notes: Array<{ text: string }> = [];
  if (input.symptomatic) {
    notes.push({ text: 'Patient symptomatic at time of reading.' });
  }
  if (input.treatmentGiven) {
    notes.push({ text: `Treatment given: ${input.treatmentGiven}` });
  }
  if (input.note) {
    notes.push({ text: input.note });
  }

  const resource: MedplumGlucoseObservation = {
    resourceType: 'Observation',
    status: 'final',
    // Glucose is a vital sign — same category and code as the vitals-form glucose,
    // so the two share a single stream and reconcile in both the vitals view and
    // the glucose profile.
    category: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.observationCategory,
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.loinc,
          code: GLUCOSE_LOINC,
          display: GLUCOSE_DISPLAY,
        },
      ],
      text: 'Blood glucose',
    },
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    performer: input.performerReference
      ? [{ reference: input.performerReference, display: input.performerDisplay ?? undefined }]
      : undefined,
    effectiveDateTime: input.recordedAt.toISOString(),
    valueQuantity: {
      value: input.valueMgDl,
      unit: 'mg/dL',
      system: 'http://unitsofmeasure.org',
      code: 'mg/dL',
    },
    interpretation: [
      {
        coding: [
          {
            system: FHIR_INTERPRETATION_SYSTEM,
            code: interpretation.code,
            display: interpretation.display,
          },
        ],
      },
    ],
    method: { text: 'Capillary fingerstick (glucometer)' },
    note: notes.length ? notes : undefined,
    extension,
  };

  const created = (await medplum.createResource(resource as never)) as MedplumGlucoseObservation;
  if (!created?.id) {
    throw new Error('Failed to persist glucose reading in Medplum.');
  }
  return created;
}

export async function listGlucoseReadings(
  patientId: string,
  count = 200,
  options?: { daysBack?: number },
): Promise<GlucoseReadingRow[]> {
  const medplum = await getMedplumClient();
  const daysBack = options?.daysBack ?? 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const dateParam = `ge${startDate.toISOString().slice(0, 10)}`;

  const loinc = MEDPLUM_CODE_SYSTEMS.loinc;
  const observations = (await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    // Standard glucose code OR the legacy capillary code (comma = FHIR "OR").
    code: `${loinc}|${GLUCOSE_LOINC},${loinc}|${LEGACY_GLUCOMETER_LOINC}`,
    date: dateParam,
    _count: String(count),
    _sort: '-date',
  })) as MedplumGlucoseObservation[];

  return observations.map((observation) => {
    const timingExt = observation.extension?.find(
      (ext) => ext.url === MEDPLUM_EXTENSION_URLS.glucoseTiming,
    )?.valueCode;
    const mealExt = observation.extension?.find(
      (ext) => ext.url === MEDPLUM_EXTENSION_URLS.glucoseMeal,
    )?.valueCode;

    return {
      id: observation.id ?? null,
      measuredAt: observation.effectiveDateTime ?? new Date().toISOString(),
      valueMgDl: typeof observation.valueQuantity?.value === 'number' ? observation.valueQuantity.value : Number.NaN,
      timing: isGlucoseTiming(timingExt) ? timingExt : 'random',
      meal: isGlucoseMeal(mealExt) ? mealExt : null,
      interpretationCode: observation.interpretation?.[0]?.coding?.[0]?.code ?? null,
      performer: observation.performer?.[0]?.display ?? null,
      encounterId: observation.encounter?.reference?.replace('Encounter/', '') ?? null,
      note: observation.note?.map((entry) => entry.text).filter(Boolean).join(' · ') || null,
    };
  }).filter((row) => Number.isFinite(row.valueMgDl));
}
