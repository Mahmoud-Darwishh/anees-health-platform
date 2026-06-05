export type DisruptionCode =
  | 'patient_late_cancel'
  | 'patient_no_show'
  | 'patient_refused_care'
  | 'patient_hospitalised'
  | 'patient_deceased'
  | 'family_blocked_access'
  | 'unsafe_environment'
  | 'physio_personal_emergency'
  | 'physio_vehicle_breakdown'
  | 'physio_traffic_blocked'
  | 'weather'
  | 'med_ops_reassignment'
  | 'equipment_failure'
  | 'internet_blackout'
  | 'other';

type CancellationBucket = {
  maxMinutesBeforeStart: number;
  feePercentage: number;
};

const CANCELLATION_BUCKETS: CancellationBucket[] = [
  { maxMinutesBeforeStart: 15, feePercentage: 100 },
  { maxMinutesBeforeStart: 60, feePercentage: 60 },
  { maxMinutesBeforeStart: 180, feePercentage: 30 },
  { maxMinutesBeforeStart: Number.POSITIVE_INFINITY, feePercentage: 0 },
];

const FIXED_FEE_BY_CODE: Partial<Record<DisruptionCode, number>> = {
  patient_no_show: 100,
  patient_refused_care: 75,
  patient_deceased: 0,
  patient_hospitalised: 0,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCancellationFee(params: {
  servicePriceEgp: number;
  disruptionCode: DisruptionCode;
  minutesBeforeScheduledStart: number | null;
}): { feeEgp: number; feePercentage: number } {
  const servicePrice = Number.isFinite(params.servicePriceEgp) ? Math.max(params.servicePriceEgp, 0) : 0;

  const fixedFee = FIXED_FEE_BY_CODE[params.disruptionCode];
  if (typeof fixedFee === 'number') {
    return {
      feeEgp: roundMoney(Math.min(servicePrice, Math.max(fixedFee, 0))),
      feePercentage: servicePrice > 0 ? roundMoney((Math.max(fixedFee, 0) / servicePrice) * 100) : 0,
    };
  }

  const minutes = params.minutesBeforeScheduledStart;
  const bucket = CANCELLATION_BUCKETS.find((candidate) =>
    minutes === null ? candidate.maxMinutesBeforeStart === Number.POSITIVE_INFINITY : minutes <= candidate.maxMinutesBeforeStart,
  );

  const feePercentage = bucket?.feePercentage ?? 0;
  return {
    feeEgp: roundMoney((servicePrice * feePercentage) / 100),
    feePercentage,
  };
}
