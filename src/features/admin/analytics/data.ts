import 'server-only';

import type { VisitStatus, OnlineBookingStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type RevenueBlock = {
  thisMonthEgp: number;
  last30dEgp: number;
  allTimeEgp: number;
  paymentsThisMonth: number;
};

export type FunnelRow = { status: OnlineBookingStatus; count: number };
export type VisitRow = { status: VisitStatus; count: number };
export type ClinicianLoadRow = { name: string; role: string; completed: number };
export type CoverageRow = { governorate: string; count: number };

export type OwnerAnalytics = {
  revenue: RevenueBlock;
  funnel: FunnelRow[];
  conversionRatePct: number;
  visitsThisMonth: VisitRow[];
  completedThisMonth: number;
  topClinicians: ClinicianLoadRow[];
  repeatPatientRatePct: number;
  coverage: CoverageRow[];
  generatedAtIso: string;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export async function getOwnerAnalytics(tenantId: string): Promise<OwnerAnalytics> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    revenueAll,
    revenueMonth,
    revenue30,
    paymentsMonthCount,
    funnelGroups,
    visitGroups,
    completedClinicianGroups,
    completedByPatient,
    coverageGroups,
    clinicianStaff,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { patient: { tenantId } }, _sum: { amountEgp: true } }),
    prisma.payment.aggregate({ where: { patient: { tenantId }, paymentDate: { gte: monthStart } }, _sum: { amountEgp: true } }),
    prisma.payment.aggregate({ where: { patient: { tenantId }, paymentDate: { gte: last30 } }, _sum: { amountEgp: true } }),
    prisma.payment.count({ where: { patient: { tenantId }, paymentDate: { gte: monthStart } } }),
    prisma.onlineBooking.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
    prisma.visit.groupBy({ by: ['status'], where: { tenantId, scheduledDate: { gte: monthStart } }, _count: { _all: true } }),
    prisma.visit.groupBy({
      by: ['providerId'],
      where: { tenantId, status: 'completed', scheduledDate: { gte: monthStart }, providerId: { not: null } },
      _count: { _all: true },
    }),
    prisma.visit.groupBy({ by: ['patientId'], where: { tenantId, status: 'completed' }, _count: { _all: true } }),
    prisma.onlineBooking.groupBy({ by: ['governorate'], where: { tenantId, governorate: { not: null } }, _count: { _all: true } }),
    prisma.staff.findMany({
      where: { tenantId, role: { in: ['doctor', 'nurse', 'physiotherapist'] }, providerId: { not: null } },
      select: { name: true, role: true, providerId: true },
    }),
  ]);

  const funnel: FunnelRow[] = funnelGroups.map((g) => ({ status: g.status, count: g._count._all }));
  const totalBookings = funnel.reduce((sum, r) => sum + r.count, 0);
  const paidBookings = funnel.find((r) => r.status === 'payment_completed')?.count ?? 0;
  const conversionRatePct = totalBookings > 0 ? Math.round((paidBookings / totalBookings) * 1000) / 10 : 0;

  const visitsThisMonth: VisitRow[] = visitGroups.map((g) => ({ status: g.status, count: g._count._all }));
  const completedThisMonth = visitsThisMonth.find((r) => r.status === 'completed')?.count ?? 0;

  const providerNameById = new Map<string, { name: string; role: string }>();
  for (const s of clinicianStaff) {
    if (s.providerId) providerNameById.set(s.providerId, { name: s.name, role: s.role });
  }
  const topClinicians: ClinicianLoadRow[] = completedClinicianGroups
    .map((g) => {
      const info = g.providerId ? providerNameById.get(g.providerId) : undefined;
      return { name: info?.name ?? 'Other', role: info?.role ?? '—', completed: g._count._all };
    })
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 8);

  const distinctPatients = completedByPatient.length;
  const repeatPatients = completedByPatient.filter((g) => g._count._all > 1).length;
  const repeatPatientRatePct = distinctPatients > 0 ? Math.round((repeatPatients / distinctPatients) * 1000) / 10 : 0;

  const coverage: CoverageRow[] = coverageGroups
    .map((g) => ({ governorate: g.governorate ?? 'unknown', count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return {
    revenue: {
      thisMonthEgp: Number(revenueMonth._sum.amountEgp ?? 0),
      last30dEgp: Number(revenue30._sum.amountEgp ?? 0),
      allTimeEgp: Number(revenueAll._sum.amountEgp ?? 0),
      paymentsThisMonth: paymentsMonthCount,
    },
    funnel,
    conversionRatePct,
    visitsThisMonth,
    completedThisMonth,
    topClinicians,
    repeatPatientRatePct,
    coverage,
    generatedAtIso: now.toISOString(),
  };
}
