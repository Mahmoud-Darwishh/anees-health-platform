import type { StaffRole } from '@prisma/client';

export type NurseDashboardPeriod = 'today' | 'week' | 'month' | 'custom';

export type NurseDashboardPeriodRange = {
  period: NurseDashboardPeriod;
  startDate: string | null;
  endDate: string | null;
};

export type NurseDashboardOperationalVisitRow = {
  visitId: string;
  visitCode: string;
  scheduledDate: string;
  status: string;
  patientCode: string;
  patientName: string | null;
  serviceName: string;
  areaName: string | null;
  payoutEgp: number;
};

export type NurseDashboardFinanceKpis = {
  earnedInPeriodEgp: number;
  paidInPeriodEgp: number;
  pendingEstimateEgp: number;
  lastPayoutDate: string | null;
  lastPayoutAmountEgp: number;
};

export type NurseDashboardOpsKpis = {
  scheduledVisitsInPeriod: number;
  completedVisitsInPeriod: number;
  completionRatePct: number;
  noShowVisitsInPeriod: number;
  avgPatientRatingInPeriod: number;
  canViewOperationalDrilldown: boolean;
  canViewPatientIdentifiers: boolean;
  upcomingVisits: NurseDashboardOperationalVisitRow[];
  followUpVisits: NurseDashboardOperationalVisitRow[];
};

export type NurseDashboardClinicalKpis = {
  openEscalationsAssigned: number;
  handoffsSubmitted30d: number;
  handoffsOnsiteRatePct: number;
  avgHandoffDistanceMeters: number;
  handoffAcknowledged30d: number;
};

export type NurseDashboardData = {
  staffName: string;
  staffRole: StaffRole | null;
  periodLabel: string;
  selectedPeriod: NurseDashboardPeriod;
  customStartDate: string | null;
  customEndDate: string | null;
  error: string | null;
  warnings: string[];
  finance: NurseDashboardFinanceKpis;
  operations: NurseDashboardOpsKpis;
  clinical: NurseDashboardClinicalKpis;
};
