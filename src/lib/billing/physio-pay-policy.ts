import type { DisruptionCode } from './cancellation-policy';

const PAY_FACTOR_BY_DISRUPTION: Partial<Record<DisruptionCode, number>> = {
  patient_late_cancel: 0.6,
  patient_no_show: 0.5,
  patient_refused_care: 0.5,
  patient_hospitalised: 0,
  patient_deceased: 0,
  family_blocked_access: 0.4,
  unsafe_environment: 0.5,
  physio_personal_emergency: 0,
  physio_vehicle_breakdown: 0,
  physio_traffic_blocked: 0,
  weather: 0.25,
  med_ops_reassignment: 0.25,
  equipment_failure: 0.2,
  internet_blackout: 0.2,
  other: 0,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePhysioDisruptionPayout(params: {
  plannedPayoutEgp: number;
  disruptionCode: DisruptionCode;
}): { payoutEgp: number; payoutFactor: number } {
  const planned = Number.isFinite(params.plannedPayoutEgp) ? Math.max(params.plannedPayoutEgp, 0) : 0;
  const payoutFactor = PAY_FACTOR_BY_DISRUPTION[params.disruptionCode] ?? 0;

  return {
    payoutEgp: roundMoney(planned * payoutFactor),
    payoutFactor,
  };
}
