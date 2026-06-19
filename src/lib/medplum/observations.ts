import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS, FHIR_INTERPRETATION_SYSTEM } from '@/lib/medplum/constants';
import { NURSING_VITAL_THRESHOLDS, type NumericRange } from '@/lib/config/nursing-ops-policy';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirBundleEntry = {
  resource?: MedplumObservationResource;
  request?: {
    method: 'POST';
    url: 'Observation';
  };
  response?: {
    status?: string;
  };
};

type FhirBundle = {
  resourceType: 'Bundle';
  type: 'transaction';
  entry?: FhirBundleEntry[];
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

type FhirInterpretation = Array<{ coding?: FhirCoding[] }>;

type MedplumObservationResource = {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{ coding?: FhirCoding[] }>;
  code?: { coding?: FhirCoding[]; text?: string };
  subject: FhirReference;
  encounter?: FhirReference;
  performer?: FhirReference[];
  effectiveDateTime?: string;
  interpretation?: FhirInterpretation;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  component?: Array<{
    code?: { coding?: FhirCoding[] };
    interpretation?: FhirInterpretation;
    valueQuantity?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
  }>;
};

export type CreateVitalObservationsInput = {
  patientId: string;
  encounterId?: string | null;
  performerReference?: string | null;
  performerDisplay?: string | null;
  recordedAt: Date;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperatureC?: number | null;
  glucoseMgDl?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  spo2Pct?: number | null;
  painScore?: number | null;
};

/** Abnormal-flag keys surfaced for display (only L/H are stored). */
export type VitalFlagKey =
  | 'systolicBp'
  | 'diastolicBp'
  | 'heartRate'
  | 'respiratoryRate'
  | 'temperatureC'
  | 'glucoseMgDl'
  | 'spo2Pct'
  | 'painScore'
  | 'bmi';

export type NormalizedVitalsRow = {
  measuredAt: string;
  encounterId?: string | null;
  performer?: string | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperatureC?: number | null;
  glucoseMgDl?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  spo2Pct?: number | null;
  painScore?: number | null;
  /** Per-metric abnormal flags parsed from the stored `interpretation`. */
  flags: Partial<Record<VitalFlagKey, 'L' | 'H'>>;
};

function baseObservation(input: CreateVitalObservationsInput): Pick<MedplumObservationResource, 'status' | 'category' | 'subject' | 'encounter' | 'performer' | 'effectiveDateTime'> {
  return {
    status: 'final',
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
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    performer: input.performerReference
      ? [{ reference: input.performerReference, display: input.performerDisplay ?? undefined }]
      : undefined,
    effectiveDateTime: input.recordedAt.toISOString(),
  };
}

function quantity(value: number, unit: string, code: string) {
  return {
    value,
    unit,
    system: 'http://unitsofmeasure.org',
    code,
  };
}

function flag(code: 'L' | 'H' | 'N', display: string): FhirInterpretation {
  return [{ coding: [{ system: FHIR_INTERPRETATION_SYSTEM, code, display }] }];
}

/** Interpretation (Low/Normal/High) for a value against a configured alert range. */
function rangeInterpretation(value: number, range: NumericRange): FhirInterpretation {
  if (typeof range.min === 'number' && value < range.min) return flag('L', 'Low');
  if (typeof range.max === 'number' && value > range.max) return flag('H', 'High');
  return flag('N', 'Normal');
}

/** BMI interpretation against standard WHO cut-offs (kg/m²). */
function bmiInterpretation(value: number): FhirInterpretation {
  if (value < 18.5) return flag('L', 'Underweight');
  if (value < 25) return flag('N', 'Normal');
  return flag('H', value < 30 ? 'Overweight' : 'Obese');
}

function parseCode(observation: MedplumObservationResource): string | undefined {
  return observation.code?.coding?.[0]?.code;
}

function parseNumeric(value?: { value?: number }): number | null {
  if (typeof value?.value !== 'number' || Number.isNaN(value.value)) {
    return null;
  }
  return value.value;
}

function interpFlag(interpretation?: FhirInterpretation): 'L' | 'H' | null {
  const code = interpretation?.[0]?.coding?.[0]?.code;
  return code === 'L' || code === 'H' ? code : null;
}

export async function createVitalObservations(
  input: CreateVitalObservationsInput,
): Promise<MedplumObservationResource[]> {
  const medplum = await getMedplumClient();
  const common = baseObservation(input);
  const thresholds = NURSING_VITAL_THRESHOLDS;

  const resources: MedplumObservationResource[] = [];

  if (typeof input.systolicBp === 'number' && typeof input.diastolicBp === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '85354-9', display: 'Blood pressure panel' }],
        text: 'Blood pressure',
      },
      component: [
        {
          code: {
            coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '8480-6', display: 'Systolic blood pressure' }],
          },
          valueQuantity: quantity(input.systolicBp, 'mmHg', 'mm[Hg]'),
          interpretation: rangeInterpretation(input.systolicBp, thresholds.systolicBp),
        },
        {
          code: {
            coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '8462-4', display: 'Diastolic blood pressure' }],
          },
          valueQuantity: quantity(input.diastolicBp, 'mmHg', 'mm[Hg]'),
          interpretation: rangeInterpretation(input.diastolicBp, thresholds.diastolicBp),
        },
      ],
    });
  }

  if (typeof input.heartRate === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '8867-4', display: 'Heart rate' }],
        text: 'Heart rate',
      },
      valueQuantity: quantity(input.heartRate, 'beats/minute', '/min'),
      interpretation: rangeInterpretation(input.heartRate, thresholds.heartRate),
    });
  }

  if (typeof input.respiratoryRate === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '9279-1', display: 'Respiratory rate' }],
        text: 'Respiratory rate',
      },
      valueQuantity: quantity(input.respiratoryRate, 'breaths/minute', '/min'),
      interpretation: rangeInterpretation(input.respiratoryRate, thresholds.respiratoryRate),
    });
  }

  if (typeof input.temperatureC === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '8310-5', display: 'Body temperature' }],
        text: 'Body temperature',
      },
      valueQuantity: quantity(input.temperatureC, 'C', 'Cel'),
      interpretation: rangeInterpretation(input.temperatureC, thresholds.temperatureC),
    });
  }

  if (typeof input.glucoseMgDl === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '2339-0', display: 'Glucose [Mass/volume] in Blood' }],
        text: 'Blood glucose',
      },
      valueQuantity: quantity(input.glucoseMgDl, 'mg/dL', 'mg/dL'),
      interpretation: rangeInterpretation(input.glucoseMgDl, thresholds.glucoseMgDl),
    });
  }

  if (typeof input.weightKg === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '29463-7', display: 'Body weight' }],
        text: 'Body weight',
      },
      valueQuantity: quantity(input.weightKg, 'kg', 'kg'),
    });
  }

  if (typeof input.heightCm === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '8302-2', display: 'Body height' }],
        text: 'Body height',
      },
      valueQuantity: quantity(input.heightCm, 'cm', 'cm'),
    });
  }

  // Derived BMI (kg/m²) when both weight and height are present.
  if (typeof input.weightKg === 'number' && typeof input.heightCm === 'number' && input.heightCm > 0) {
    const heightM = input.heightCm / 100;
    const bmi = Math.round((input.weightKg / (heightM * heightM)) * 10) / 10;
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [{ system: MEDPLUM_CODE_SYSTEMS.loinc, code: '39156-5', display: 'Body mass index (BMI)' }],
        text: 'Body mass index',
      },
      valueQuantity: quantity(bmi, 'kg/m2', 'kg/m2'),
      interpretation: bmiInterpretation(bmi),
    });
  }

  if (typeof input.spo2Pct === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.loinc,
            code: '59408-5',
            display: 'Oxygen saturation in Arterial blood by Pulse oximetry',
          },
        ],
        text: 'SpO2',
      },
      valueQuantity: quantity(input.spo2Pct, '%', '%'),
      interpretation: rangeInterpretation(input.spo2Pct, thresholds.spo2Pct),
    });
  }

  if (typeof input.painScore === 'number') {
    resources.push({
      resourceType: 'Observation',
      ...common,
      code: {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.loinc,
            code: '72514-3',
            display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported',
          },
        ],
        text: 'Pain score',
      },
      valueQuantity: quantity(input.painScore, 'score', '{score}'),
      interpretation: rangeInterpretation(input.painScore, thresholds.painScore),
    });
  }

  if (resources.length === 0) {
    return [];
  }

  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: resources.map((resource) => ({
      resource,
      request: {
        method: 'POST',
        url: 'Observation',
      },
    })),
  };

  const response = (await medplum.executeBatch(bundle as never)) as FhirBundle;
  const created = (response.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is MedplumObservationResource => !!resource?.id);

  if (created.length !== resources.length) {
    throw new Error('Failed to persist one or more vital observations in transaction bundle.');
  }

  return created;
}

export async function listPatientVitalObservations(
  patientId: string,
  count = 120,
  options?: { daysBack?: number },
): Promise<MedplumObservationResource[]> {
  const medplum = await getMedplumClient();
  const daysBack = options?.daysBack ?? 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const dateParam = `ge${startDate.toISOString().slice(0, 10)}`;

  return (await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    category: 'vital-signs',
    date: dateParam,
    _count: String(count),
    _sort: '-date',
  })) as MedplumObservationResource[];
}

export async function listRecentPatientVitals(patientId: string, count = 25): Promise<NormalizedVitalsRow[]> {
  const observations = await listPatientVitalObservations(patientId, 120, { daysBack: 90 });
  const rows = new Map<string, NormalizedVitalsRow>();

  for (const observation of observations) {
    const code = parseCode(observation);
    const measuredAt = observation.effectiveDateTime ?? new Date().toISOString();
    const key = `${observation.encounter?.reference ?? 'none'}:${measuredAt}`;

    if (!rows.has(key)) {
      rows.set(key, {
        measuredAt,
        encounterId: observation.encounter?.reference?.replace('Encounter/', '') ?? null,
        performer: observation.performer?.[0]?.display ?? null,
        flags: {},
      });
    }

    const row = rows.get(key)!;
    const setFlag = (flagKey: VitalFlagKey, interpretation?: FhirInterpretation) => {
      const f = interpFlag(interpretation);
      if (f) row.flags[flagKey] = f;
    };

    if (code === '85354-9') {
      for (const component of observation.component ?? []) {
        const componentCode = component.code?.coding?.[0]?.code;
        if (componentCode === '8480-6') {
          row.systolicBp = parseNumeric(component.valueQuantity);
          setFlag('systolicBp', component.interpretation);
        }
        if (componentCode === '8462-4') {
          row.diastolicBp = parseNumeric(component.valueQuantity);
          setFlag('diastolicBp', component.interpretation);
        }
      }
      continue;
    }

    if (code === '8867-4') {
      row.heartRate = parseNumeric(observation.valueQuantity);
      setFlag('heartRate', observation.interpretation);
    }
    if (code === '9279-1') {
      row.respiratoryRate = parseNumeric(observation.valueQuantity);
      setFlag('respiratoryRate', observation.interpretation);
    }
    if (code === '8310-5') {
      row.temperatureC = parseNumeric(observation.valueQuantity);
      setFlag('temperatureC', observation.interpretation);
    }
    if (code === '2339-0') {
      row.glucoseMgDl = parseNumeric(observation.valueQuantity);
      setFlag('glucoseMgDl', observation.interpretation);
    }
    if (code === '29463-7') row.weightKg = parseNumeric(observation.valueQuantity);
    if (code === '8302-2') row.heightCm = parseNumeric(observation.valueQuantity);
    if (code === '39156-5') {
      row.bmi = parseNumeric(observation.valueQuantity);
      setFlag('bmi', observation.interpretation);
    }
    if (code === '59408-5') {
      row.spo2Pct = parseNumeric(observation.valueQuantity);
      setFlag('spo2Pct', observation.interpretation);
    }
    if (code === '72514-3') {
      row.painScore = parseNumeric(observation.valueQuantity);
      setFlag('painScore', observation.interpretation);
    }
  }

  return [...rows.values()]
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
    .slice(0, count);
}
