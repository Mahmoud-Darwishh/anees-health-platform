import 'server-only';

import { type StaffRole, VisitStatus } from '@prisma/client';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listEscalationTasks } from '@/lib/medplum/tasks';
import { listNursingShiftHandoffsByPerformer } from '@/lib/medplum/care-reports';
import type {
  NurseDashboardData,
  NurseDashboardOperationalVisitRow,
  NurseDashboardPeriod,
} from './types';

const OPERATIONAL_DRILLDOWN_ROLES: StaffRole[] = ['nurse', 'admin', 'superadmin'];
const PATIENT_IDENTIFIER_ROLES: StaffRole[] = ['admin', 'superadmin'];

type NurseDashboardFilterInput = {
  period?: string;
  startDate?: string;
  endDate?: string;
};

type NurseDashboardPeriodContext = {
  period: NurseDashboardPeriod;
  start: Date;
  end: Date;
  label: string;
  customStartDate: string | null;
  customEndDate: string | null;
  warnings: string[];
};

type OperationalVisitRecord = {
  id: string;
  code: string;
  scheduledDate: Date;
  status: VisitStatus;
  providerPayoutEgp: unknown;
  patient: {
    code: string;
    fullName: string;
  };
  service: {
    name: string;
  };
  area: {
    name: string;
  } | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfIsoWeek(date: Date): Date {
  const base = startOfDay(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return startOfDay(base);
}

function endOfIsoWeek(date: Date): Date {
  const start = startOfIsoWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safePercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function normalizePeriod(input?: string): NurseDashboardPeriod {
  if (input === 'today' || input === 'week' || input === 'month' || input === 'custom') {
    return input;
  }
  return 'month';
}

function parseDateInput(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  return parsed;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPeriodLabel(period: NurseDashboardPeriod, start: Date, end: Date): string {
  if (period === 'today') {
    return `Today (${start.toLocaleDateString('en-GB')})`;
  }
  if (period === 'week') {
    return `This week (${start.toLocaleDateString('en-GB')} - ${end.toLocaleDateString('en-GB')})`;
  }
  if (period === 'month') {
    return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  return `Custom (${start.toLocaleDateString('en-GB')} - ${end.toLocaleDateString('en-GB')})`;
}

function resolvePeriodContext(filters?: NurseDashboardFilterInput): NurseDashboardPeriodContext {
  const warnings: string[] = [];
  const now = new Date();
  const selectedPeriod = normalizePeriod(filters?.period);

  if (selectedPeriod === 'today') {
    const start = startOfDay(now);
    const end = endOfDay(now);
    return {
      period: selectedPeriod,
      start,
      end,
      label: formatPeriodLabel(selectedPeriod, start, end),
      customStartDate: null,
      customEndDate: null,
      warnings,
    };
  }

  if (selectedPeriod === 'week') {
    const start = startOfIsoWeek(now);
    const end = endOfIsoWeek(now);
    return {
      period: selectedPeriod,
      start,
      end,
      label: formatPeriodLabel(selectedPeriod, start, end),
      customStartDate: null,
      customEndDate: null,
      warnings,
    };
  }

  if (selectedPeriod === 'custom') {
    const rawStart = filters?.startDate ?? null;
    const rawEnd = filters?.endDate ?? null;
    const parsedStart = parseDateInput(rawStart ?? undefined);
    const parsedEnd = parseDateInput(rawEnd ?? undefined);

    if (parsedStart && parsedEnd && parsedStart <= parsedEnd) {
      const start = startOfDay(parsedStart);
      const end = endOfDay(parsedEnd);
      return {
        period: selectedPeriod,
        start,
        end,
        label: formatPeriodLabel(selectedPeriod, start, end),
        customStartDate: formatDateInput(parsedStart),
        customEndDate: formatDateInput(parsedEnd),
        warnings,
      };
    }

    warnings.push('Custom date range was invalid. Showing month-to-date metrics instead.');
  }

  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return {
    period: 'month',
    start,
    end,
    label: formatPeriodLabel('month', start, end),
    customStartDate: formatDateInput(start),
    customEndDate: formatDateInput(end),
    warnings,
  };
}

function mapOperationalRows(
  visits: OperationalVisitRecord[],
  canViewPatientIdentifiers: boolean,
): NurseDashboardOperationalVisitRow[] {
  return visits.map((visit) => ({
    visitId: visit.id,
    visitCode: visit.code,
    scheduledDate: visit.scheduledDate.toISOString(),
    status: visit.status,
    patientCode: visit.patient.code,
    patientName: canViewPatientIdentifiers ? visit.patient.fullName : null,
    serviceName: visit.service.name,
    areaName: visit.area?.name ?? null,
    payoutEgp: decimalToNumber(visit.providerPayoutEgp),
  }));
}

const EMPTY_DASHBOARD: Omit<
  NurseDashboardData,
  'staffName' | 'staffRole' | 'periodLabel' | 'selectedPeriod' | 'customStartDate' | 'customEndDate' | 'error' | 'warnings'
> = {
  finance: {
    earnedInPeriodEgp: 0,
    paidInPeriodEgp: 0,
    pendingEstimateEgp: 0,
    lastPayoutDate: null,
    lastPayoutAmountEgp: 0,
  },
  operations: {
    scheduledVisitsInPeriod: 0,
    completedVisitsInPeriod: 0,
    completionRatePct: 0,
    noShowVisitsInPeriod: 0,
    avgPatientRatingInPeriod: 0,
    canViewOperationalDrilldown: false,
    canViewPatientIdentifiers: false,
    upcomingVisits: [],
    followUpVisits: [],
  },
  clinical: {
    openEscalationsAssigned: 0,
    handoffsSubmitted30d: 0,
    handoffsOnsiteRatePct: 0,
    avgHandoffDistanceMeters: 0,
    handoffAcknowledged30d: 0,
  },
};

export async function loadNurseDashboardData(filters?: NurseDashboardFilterInput): Promise<NurseDashboardData> {
  const periodContext = resolvePeriodContext(filters);
  let user: Awaited<ReturnType<typeof requireStaffCan>>['user'];
  try {
    ({ user } = await requireStaffCan('dashboard.nursing.read', {
      audit: {
        tableName: 'nursing_dashboard',
        recordId: 'admin_nursing_dashboard',
      },
    }));
  } catch {
    return {
      staffName: 'Unknown',
      staffRole: null,
      periodLabel: periodContext.label,
      selectedPeriod: periodContext.period,
      customStartDate: periodContext.customStartDate,
      customEndDate: periodContext.customEndDate,
      error: 'Unauthorized',
      warnings: periodContext.warnings,
      ...EMPTY_DASHBOARD,
    };
  }

  const warnings = [...periodContext.warnings];
  const periodStart = periodContext.start;
  const periodEnd = periodContext.end;
  const tenantId = sessionTenantId(user);

  const staff = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: {
      id: true,
      name: true,
      role: true,
      providerId: true,
      email: true,
    },
  });

  if (!staff) {
    return {
      staffName: user.name ?? user.email ?? 'Staff user',
      staffRole: user.staffRole,
      periodLabel: periodContext.label,
      selectedPeriod: periodContext.period,
      customStartDate: periodContext.customStartDate,
      customEndDate: periodContext.customEndDate,
      error: 'Staff profile could not be resolved.',
      warnings,
      ...EMPTY_DASHBOARD,
    };
  }

  if (!staff.providerId) {
    warnings.push('No linked provider profile found. Payout and visit KPIs are limited until provider linkage is configured.');
  }

  const canViewOperationalDrilldown = OPERATIONAL_DRILLDOWN_ROLES.includes(staff.role);
  const canViewPatientIdentifiers = PATIENT_IDENTIFIER_ROLES.includes(staff.role);

  let earnedInPeriodEgp = 0;
  let paidInPeriodEgp = 0;
  let pendingEstimateEgp = 0;
  let lastPayoutDate: string | null = null;
  let lastPayoutAmountEgp = 0;
  let scheduledVisitsInPeriod = 0;
  let completedVisitsInPeriod = 0;
  let noShowVisitsInPeriod = 0;
  let avgPatientRatingInPeriod = 0;
  let upcomingVisits: NurseDashboardOperationalVisitRow[] = [];
  let followUpVisits: NurseDashboardOperationalVisitRow[] = [];

  if (staff.providerId) {
    const [
      visitCountByStatus,
      visitPayoutAggregate,
      payoutAggregate,
      latestPayout,
      ratingAggregate,
      upcomingVisitRecords,
      followUpVisitRecords,
    ] = await Promise.all([
      prisma.visit.groupBy({
        by: ['status'],
        where: {
          tenantId,
          providerId: staff.providerId,
          scheduledDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.visit.aggregate({
        where: {
          tenantId,
          providerId: staff.providerId,
          status: VisitStatus.completed,
          scheduledDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: {
          providerPayoutEgp: true,
        },
      }),
      prisma.providerPayout.aggregate({
        where: {
          providerId: staff.providerId,
          payoutDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: {
          netAmountEgp: true,
        },
      }),
      prisma.providerPayout.findFirst({
        where: {
          providerId: staff.providerId,
        },
        orderBy: { payoutDate: 'desc' },
        select: {
          payoutDate: true,
          netAmountEgp: true,
        },
      }),
      prisma.visit.aggregate({
        where: {
          tenantId,
          providerId: staff.providerId,
          status: VisitStatus.completed,
          scheduledDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          patientRating: {
            not: null,
          },
        },
        _avg: {
          patientRating: true,
        },
      }),
      canViewOperationalDrilldown
        ? prisma.visit.findMany({
            where: {
              tenantId,
              providerId: staff.providerId,
              scheduledDate: {
                gte: periodStart,
                lte: periodEnd,
              },
              status: {
                in: [VisitStatus.scheduled, VisitStatus.in_progress, VisitStatus.rescheduled],
              },
            },
            orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
            take: 20,
            select: {
              id: true,
              code: true,
              scheduledDate: true,
              status: true,
              providerPayoutEgp: true,
              patient: {
                select: {
                  code: true,
                  fullName: true,
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
              area: {
                select: {
                  name: true,
                },
              },
            },
          })
        : Promise.resolve([] as OperationalVisitRecord[]),
      canViewOperationalDrilldown
        ? prisma.visit.findMany({
            where: {
              tenantId,
              providerId: staff.providerId,
              scheduledDate: {
                gte: periodStart,
                lte: periodEnd,
              },
              status: {
                in: [VisitStatus.no_show, VisitStatus.rescheduled, VisitStatus.cancelled],
              },
            },
            orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
            take: 20,
            select: {
              id: true,
              code: true,
              scheduledDate: true,
              status: true,
              providerPayoutEgp: true,
              patient: {
                select: {
                  code: true,
                  fullName: true,
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
              area: {
                select: {
                  name: true,
                },
              },
            },
          })
        : Promise.resolve([] as OperationalVisitRecord[]),
    ]);

    for (const entry of visitCountByStatus) {
      const count = entry._count._all;
      if (entry.status === VisitStatus.completed) completedVisitsInPeriod += count;
      if (entry.status === VisitStatus.no_show) noShowVisitsInPeriod += count;
      if (
        entry.status === VisitStatus.scheduled ||
        entry.status === VisitStatus.in_progress ||
        entry.status === VisitStatus.completed ||
        entry.status === VisitStatus.no_show ||
        entry.status === VisitStatus.rescheduled
      ) {
        scheduledVisitsInPeriod += count;
      }
    }

    earnedInPeriodEgp = decimalToNumber(visitPayoutAggregate._sum.providerPayoutEgp);
    paidInPeriodEgp = decimalToNumber(payoutAggregate._sum?.netAmountEgp);
    pendingEstimateEgp = Math.max(earnedInPeriodEgp - paidInPeriodEgp, 0);
    avgPatientRatingInPeriod = Number(ratingAggregate._avg.patientRating ?? 0);

    if (latestPayout) {
      lastPayoutDate = latestPayout.payoutDate.toISOString();
      lastPayoutAmountEgp = decimalToNumber(latestPayout.netAmountEgp);
    }

    upcomingVisits = mapOperationalRows(upcomingVisitRecords, canViewPatientIdentifiers);
    followUpVisits = mapOperationalRows(followUpVisitRecords, canViewPatientIdentifiers);
  }

  let openEscalationsAssigned = 0;
  let handoffsSubmitted30d = 0;
  let handoffsOnsiteRatePct = 0;
  let avgHandoffDistanceMeters = 0;
  let handoffAcknowledged30d = 0;

  try {
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
    });

    const [openEscalations, handoffs] = await Promise.all([
      listEscalationTasks({
        ownerReference: practitioner.reference,
        statuses: ['requested', 'accepted', 'in-progress', 'on-hold', 'ready', 'received'],
      }),
      listNursingShiftHandoffsByPerformer(practitioner.reference, { daysBack: 30, count: 250 }),
    ]);

    openEscalationsAssigned = openEscalations.length;
    handoffsSubmitted30d = handoffs.length;

    const onsiteCount = handoffs.filter((handoff) => handoff.withinPatientRadius === true).length;
    handoffsOnsiteRatePct = safePercent(onsiteCount, handoffs.length);

    const distanceRows = handoffs
      .map((handoff) => handoff.distanceFromPatientMeters)
      .filter((distance): distance is number => typeof distance === 'number' && Number.isFinite(distance));

    if (distanceRows.length > 0) {
      avgHandoffDistanceMeters = Math.round(distanceRows.reduce((sum, value) => sum + value, 0) / distanceRows.length);
    }

    handoffAcknowledged30d = handoffs.filter((handoff) => !!handoff.incomingNurseAcknowledgedAt).length;
  } catch {
    warnings.push('Medplum clinical KPIs are temporarily unavailable. Finance and operations metrics are still available.');
  }

  return {
    staffName: staff.name,
    staffRole: staff.role,
    periodLabel: periodContext.label,
    selectedPeriod: periodContext.period,
    customStartDate: periodContext.customStartDate,
    customEndDate: periodContext.customEndDate,
    error: null,
    warnings,
    finance: {
      earnedInPeriodEgp,
      paidInPeriodEgp,
      pendingEstimateEgp,
      lastPayoutDate,
      lastPayoutAmountEgp,
    },
    operations: {
      scheduledVisitsInPeriod,
      completedVisitsInPeriod,
      completionRatePct: safePercent(completedVisitsInPeriod, scheduledVisitsInPeriod),
      noShowVisitsInPeriod,
      avgPatientRatingInPeriod: Number(avgPatientRatingInPeriod.toFixed(2)),
      canViewOperationalDrilldown,
      canViewPatientIdentifiers,
      upcomingVisits,
      followUpVisits,
    },
    clinical: {
      openEscalationsAssigned,
      handoffsSubmitted30d,
      handoffsOnsiteRatePct,
      avgHandoffDistanceMeters,
      handoffAcknowledged30d,
    },
  };
}
