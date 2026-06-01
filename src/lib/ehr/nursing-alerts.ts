import 'server-only';

import type { CreateVitalObservationsInput } from '@/lib/medplum/observations';
import {
  NURSING_VITAL_THRESHOLDS,
  type NursingVitalThresholdConfig,
  type NumericRange,
} from '@/lib/config/nursing-ops-policy';

export type VitalsThresholdBreach = {
  key: 'systolicBp' | 'diastolicBp' | 'heartRate' | 'temperatureC' | 'glucoseMgDl' | 'spo2Pct' | 'painScore';
  label: string;
  value: number;
  min: number | null;
  max: number | null;
};

type EvaluatedVitalsInput = Pick<
  CreateVitalObservationsInput,
  'systolicBp' | 'diastolicBp' | 'heartRate' | 'temperatureC' | 'glucoseMgDl' | 'spo2Pct' | 'painScore'
>;

function checkRange(
  key: VitalsThresholdBreach['key'],
  label: string,
  value: number | null | undefined,
  range: NumericRange,
): VitalsThresholdBreach | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  if (typeof range.min === 'number' && value < range.min) {
    return {
      key,
      label,
      value,
      min: range.min,
      max: typeof range.max === 'number' ? range.max : null,
    };
  }

  if (typeof range.max === 'number' && value > range.max) {
    return {
      key,
      label,
      value,
      min: typeof range.min === 'number' ? range.min : null,
      max: range.max,
    };
  }

  return null;
}

export function evaluateVitalsThresholdBreaches(
  input: EvaluatedVitalsInput,
  config: NursingVitalThresholdConfig = NURSING_VITAL_THRESHOLDS,
): VitalsThresholdBreach[] {
  const checks: Array<VitalsThresholdBreach | null> = [
    checkRange('systolicBp', 'Systolic BP', input.systolicBp, config.systolicBp),
    checkRange('diastolicBp', 'Diastolic BP', input.diastolicBp, config.diastolicBp),
    checkRange('heartRate', 'Heart Rate', input.heartRate, config.heartRate),
    checkRange('temperatureC', 'Temperature (C)', input.temperatureC, config.temperatureC),
    checkRange('glucoseMgDl', 'Glucose (mg/dL)', input.glucoseMgDl, config.glucoseMgDl),
    checkRange('spo2Pct', 'SpO2 (%)', input.spo2Pct, config.spo2Pct),
    checkRange('painScore', 'Pain score', input.painScore, config.painScore),
  ];

  return checks.filter((entry): entry is VitalsThresholdBreach => !!entry);
}

export function formatVitalsThresholdBreachSummary(breaches: VitalsThresholdBreach[]): string {
  if (breaches.length === 0) {
    return '';
  }

  return breaches
    .map((breach) => {
      const boundary =
        breach.min !== null && breach.max !== null
          ? `${breach.min}-${breach.max}`
          : breach.min !== null
            ? `>= ${breach.min}`
            : breach.max !== null
              ? `<= ${breach.max}`
              : 'configured range';

      return `${breach.label}: ${breach.value} (expected ${boundary})`;
    })
    .join('; ');
}
