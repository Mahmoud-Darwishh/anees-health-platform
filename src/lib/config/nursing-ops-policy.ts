export type NumericRange = {
  min?: number;
  max?: number;
};

export type NursingVitalThresholdConfig = {
  systolicBp: NumericRange;
  diastolicBp: NumericRange;
  heartRate: NumericRange;
  temperatureC: NumericRange;
  glucoseMgDl: NumericRange;
  spo2Pct: NumericRange;
  painScore: NumericRange;
};

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const NURSING_VITAL_THRESHOLDS: NursingVitalThresholdConfig = {
  systolicBp: {
    min: parseNumber(process.env.NURSING_ALERT_BP_SYSTOLIC_MIN, 90),
    max: parseNumber(process.env.NURSING_ALERT_BP_SYSTOLIC_MAX, 180),
  },
  diastolicBp: {
    min: parseNumber(process.env.NURSING_ALERT_BP_DIASTOLIC_MIN, 60),
    max: parseNumber(process.env.NURSING_ALERT_BP_DIASTOLIC_MAX, 110),
  },
  heartRate: {
    min: parseNumber(process.env.NURSING_ALERT_HR_MIN, 50),
    max: parseNumber(process.env.NURSING_ALERT_HR_MAX, 120),
  },
  temperatureC: {
    min: parseNumber(process.env.NURSING_ALERT_TEMP_MIN_C, 35.0),
    max: parseNumber(process.env.NURSING_ALERT_TEMP_MAX_C, 38.5),
  },
  glucoseMgDl: {
    min: parseNumber(process.env.NURSING_ALERT_GLUCOSE_MIN, 70),
    max: parseNumber(process.env.NURSING_ALERT_GLUCOSE_MAX, 250),
  },
  spo2Pct: {
    min: parseNumber(process.env.NURSING_ALERT_SPO2_MIN, 92),
    max: parseNumber(process.env.NURSING_ALERT_SPO2_MAX, 100),
  },
  painScore: {
    min: parseNumber(process.env.NURSING_ALERT_PAIN_MIN, 0),
    max: parseNumber(process.env.NURSING_ALERT_PAIN_MAX, 7),
  },
};

export const NURSING_SHIFT_ACK_WINDOW_MINUTES = parseNumber(
  process.env.NURSING_SHIFT_ACK_WINDOW_MINUTES,
  20,
);

export const ESCALATION_SLA_ACK_MINUTES = parseNumber(
  process.env.ESCALATION_SLA_ACK_MINUTES,
  15,
);
