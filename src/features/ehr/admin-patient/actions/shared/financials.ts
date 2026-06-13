import 'server-only';

import { calculateCancellationFee } from '@/lib/billing/cancellation-policy';
import type { DisruptionCode } from '@/lib/billing/cancellation-policy';
import { calculatePhysioDisruptionPayout } from '@/lib/billing/physio-pay-policy';
import { prisma } from '@/lib/db/prisma';

export function parseScheduledVisitDateTime(visit: {
  scheduledDate: Date;
  scheduledTime: string | null;
}): Date {
  const base = new Date(visit.scheduledDate);
  const scheduledTime = (visit.scheduledTime ?? '').trim();
  if (!scheduledTime) {
    return base;
  }

  const [hoursRaw, minutesRaw] = scheduledTime.split(':');
  const hours = Number(hoursRaw ?? '0');
  const minutes = Number(minutesRaw ?? '0');

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return base;
  }

  const scheduled = new Date(base);
  scheduled.setHours(Math.max(0, Math.min(23, hours)), Math.max(0, Math.min(59, minutes)), 0, 0);
  return scheduled;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function minutesBeforeScheduledStart(scheduledAt: Date, eventAt: Date): number | null {
  const deltaMs = scheduledAt.getTime() - eventAt.getTime();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  return Math.round(deltaMs / 60000);
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function applyDisruptionFinancials(params: {
  visit: {
    id: string;
    scheduledDate: Date;
    scheduledTime: string | null;
    servicePriceEgp: unknown;
    providerPayoutEgp: unknown;
  };
  eventAt: Date;
  disruptionCode: DisruptionCode;
}): Promise<void> {
  const servicePrice = Number(params.visit.servicePriceEgp ?? 0);
  const plannedPayout = Number(params.visit.providerPayoutEgp ?? 0);
  const scheduledAt = parseScheduledVisitDateTime({
    scheduledDate: params.visit.scheduledDate,
    scheduledTime: params.visit.scheduledTime,
  });

  const { feeEgp } = calculateCancellationFee({
    servicePriceEgp: servicePrice,
    disruptionCode: params.disruptionCode,
    minutesBeforeScheduledStart: minutesBeforeScheduledStart(scheduledAt, params.eventAt),
  });

  const { payoutEgp } = calculatePhysioDisruptionPayout({
    plannedPayoutEgp: plannedPayout,
    disruptionCode: params.disruptionCode,
  });

  const nextNetPrice = roundMoney(Math.max(servicePrice - feeEgp, 0));

  await prisma.visit.update({
    where: { id: params.visit.id },
    data: {
      discountEgp: feeEgp,
      netPriceEgp: nextNetPrice,
      providerPayoutEgp: payoutEgp,
    },
  });
}
