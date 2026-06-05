import 'server-only';

import type { VisitStatus } from '@prisma/client';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';

export type EarningsVisitItem = {
  id: string;
  visitDateIso: string;
  patientInitials: string;
  serviceCode: string;
  grossEgp: number;
  deductionsEgp: number;
  netEgp: number;
  stateLabel: string;
};

export type ClinicianEarningsData = {
  warning: string | null;
  weekVisits: number;
  weekEarningsEgp: number;
  monthVisits: number;
  monthEarningsEgp: number;
  allTimeVisits: number;
  allTimeEarningsEgp: number;
  nextPayoutDateLabel: string | null;
  currentPeriodVisits: number;
  currentPeriodEgp: number;
  recentVisits: EarningsVisitItem[];
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function startOfWeek(value: Date): Date {
  const day = value.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(value);
  monday.setDate(value.getDate() - diffToMonday);
  return startOfDay(monday);
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number((value as { toString: () => string }).toString()) || 0;
  }
  return 0;
}

function patientInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function statusLabel(status: VisitStatus, hasCheckedOut: boolean): string {
  if (status === 'completed' || hasCheckedOut) return 'Completed';
  if (status === 'in_progress') return 'In progress';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'no_show') return 'No show';
  return status;
}

function formatDateLabel(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export async function getClinicianEarningsData(): Promise<ClinicianEarningsData> {
  const user = await getStaffUser(['physiotherapist', 'admin', 'superadmin']);
  if (!user?.staffId) {
    throw new Error('Unauthorized');
  }

  const staff = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: { providerId: true },
  });

  if (!staff?.providerId) {
    return {
      warning: 'Your staff account is not linked to a provider profile yet.',
      weekVisits: 0,
      weekEarningsEgp: 0,
      monthVisits: 0,
      monthEarningsEgp: 0,
      allTimeVisits: 0,
      allTimeEarningsEgp: 0,
      nextPayoutDateLabel: null,
      currentPeriodVisits: 0,
      currentPeriodEgp: 0,
      recentVisits: [],
    };
  }

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const currentPeriodStart = now.getDate() <= 15
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth(), 16);
  const nextPayoutDate = now.getDate() <= 15
    ? new Date(now.getFullYear(), now.getMonth(), 18)
    : new Date(now.getFullYear(), now.getMonth() + 1, 3);

  const settledFilter = {
    providerId: staff.providerId,
    OR: [{ status: 'completed' as const }, { checkOutAt: { not: null } }],
  };

  const [
    weekAgg,
    monthAgg,
    allAgg,
    currentPeriodAgg,
    recentVisitsRaw,
  ] = await Promise.all([
    prisma.visit.aggregate({
      where: {
        ...settledFilter,
        scheduledDate: { gte: weekStart },
      },
      _count: { _all: true },
      _sum: { providerPayoutEgp: true },
    }),
    prisma.visit.aggregate({
      where: {
        ...settledFilter,
        scheduledDate: { gte: monthStart },
      },
      _count: { _all: true },
      _sum: { providerPayoutEgp: true },
    }),
    prisma.visit.aggregate({
      where: settledFilter,
      _count: { _all: true },
      _sum: { providerPayoutEgp: true },
    }),
    prisma.visit.aggregate({
      where: {
        ...settledFilter,
        scheduledDate: { gte: currentPeriodStart },
      },
      _count: { _all: true },
      _sum: { providerPayoutEgp: true },
    }),
    prisma.visit.findMany({
      where: {
        providerId: staff.providerId,
      },
      orderBy: [{ scheduledDate: 'desc' }, { updatedAt: 'desc' }],
      take: 15,
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        checkOutAt: true,
        servicePriceEgp: true,
        providerPayoutEgp: true,
        patient: {
          select: {
            fullName: true,
          },
        },
        service: {
          select: {
            code: true,
          },
        },
      },
    }),
  ]);

  const recentVisits: EarningsVisitItem[] = recentVisitsRaw.map((visit) => {
    const gross = toNumber(visit.servicePriceEgp);
    const net = toNumber(visit.providerPayoutEgp);
    const deductions = Math.max(0, gross - net);

    return {
      id: visit.id,
      visitDateIso: visit.scheduledDate.toISOString(),
      patientInitials: patientInitials(visit.patient.fullName),
      serviceCode: visit.service.code,
      grossEgp: Number(gross.toFixed(2)),
      deductionsEgp: Number(deductions.toFixed(2)),
      netEgp: Number(net.toFixed(2)),
      stateLabel: statusLabel(visit.status, Boolean(visit.checkOutAt)),
    };
  });

  return {
    warning: null,
    weekVisits: weekAgg._count._all,
    weekEarningsEgp: Number(toNumber(weekAgg._sum.providerPayoutEgp).toFixed(2)),
    monthVisits: monthAgg._count._all,
    monthEarningsEgp: Number(toNumber(monthAgg._sum.providerPayoutEgp).toFixed(2)),
    allTimeVisits: allAgg._count._all,
    allTimeEarningsEgp: Number(toNumber(allAgg._sum.providerPayoutEgp).toFixed(2)),
    nextPayoutDateLabel: formatDateLabel(nextPayoutDate),
    currentPeriodVisits: currentPeriodAgg._count._all,
    currentPeriodEgp: Number(toNumber(currentPeriodAgg._sum.providerPayoutEgp).toFixed(2)),
    recentVisits,
  };
}