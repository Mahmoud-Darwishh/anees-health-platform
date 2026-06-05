import 'server-only';

import { type VisitStatus } from '@prisma/client';
import { notFound } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import { careReportCode, careReportComponentText, listPatientCareReports } from '@/lib/medplum/care-reports';

export type SessionTemplate = 'custom' | 'post_op_knee' | 'stroke_rehab' | 'low_back_pain' | 'geriatric_mobility';
export type RankingWindow = '7d' | '30d' | 'all';

export type PhysioSessionWorkspaceData = {
  visit: {
    id: string;
    code: string;
    status: VisitStatus;
    effectiveState: string;
    scheduledTime: string | null;
    serviceName: string;
    areaName: string | null;
    patient: {
      medplumPatientId: string;
      fullName: string;
      arabicName: string | null;
      addressDetail: string | null;
      landmark: string | null;
    };
  };
  canDocumentSession: boolean;
  recentAssessments: Array<{
    id: string;
    title: string;
    type: string;
    score: number | null;
    authored: string | null;
  }>;
  sessionDashboard: {
    totalSessions: number;
    avgPainDrop: number | null;
    readyOrNearDischarge: number;
    topTemplate: string;
    templateDistribution: Array<{
      key: SessionTemplate;
      label: string;
      count: number;
      percentage: number;
    }>;
    painTrend: Array<{
      dateLabel: string;
      painBefore: number | null;
      painAfter: number | null;
      drop: number | null;
    }>;
    weeklyPainSparkline: Array<{
      label: string;
      avgDrop: number | null;
    }>;
    templateOutcomeRanking: Array<{
      key: SessionTemplate;
      label: string;
      sessions: number;
      avgDrop: number;
    }>;
    templateOutcomeRankingWindow: RankingWindow;
  };
};

function deriveLegacyState(visit: {
  status: VisitStatus;
  acknowledgedAt: Date | null;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}): string {
  if (visit.status === 'cancelled' || visit.status === 'no_show' || visit.status === 'completed') {
    return 'closed';
  }
  if (visit.checkOutAt) return 'checked_out';
  if (visit.checkInAt) return 'checked_in';
  if (visit.arrivedAt) return 'arrived';
  if (visit.enRouteAt) return 'en_route';
  if (visit.acknowledgedAt) return 'acknowledged';
  return 'scheduled';
}

async function readVisitState(visitId: string): Promise<string | null> {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { state: true },
    });
    return visit?.state ?? null;
  } catch {
    return null;
  }
}

function toTemplateLabel(template: SessionTemplate): string {
  if (template === 'post_op_knee') return 'Post-op knee';
  if (template === 'stroke_rehab') return 'Stroke rehab';
  if (template === 'low_back_pain') return 'Low back pain';
  if (template === 'geriatric_mobility') return 'Geriatric mobility';
  return 'Custom';
}

function parseNumericComponent(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWithinWindow(isoDate: string | undefined, days: number): boolean {
  if (!isoDate) return false;
  const value = new Date(isoDate);
  if (Number.isNaN(value.getTime())) return false;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return value >= start && value <= now;
}

export async function getPhysioSessionWorkspaceData(
  visitId: string,
  rankingWindow: RankingWindow = 'all',
): Promise<PhysioSessionWorkspaceData> {
  const user = await getStaffUser(['physiotherapist', 'admin', 'superadmin']);
  if (!user?.staffId) {
    throw new Error('Unauthorized');
  }

  const staff = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: { providerId: true },
  });

  if (!staff?.providerId) {
    notFound();
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      providerId: staff.providerId,
      patient: {
        deletedAt: null,
      },
    },
    select: {
      id: true,
      code: true,
      status: true,
      scheduledTime: true,
      acknowledgedAt: true,
      enRouteAt: true,
      arrivedAt: true,
      checkInAt: true,
      checkOutAt: true,
      patient: {
        select: {
          medplumPatientId: true,
          fullName: true,
          arabicName: true,
          addressDetail: true,
          landmark: true,
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
  });

  if (!visit?.patient.medplumPatientId) {
    notFound();
  }

  const state = (await readVisitState(visit.id)) ?? deriveLegacyState(visit);

  let recentAssessments: PhysioSessionWorkspaceData['recentAssessments'] = [];
  try {
    const assessments = await listPatientAssessments(visit.patient.medplumPatientId, 10);
    recentAssessments = assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      score: typeof assessment.score === 'number' ? assessment.score : null,
      authored: assessment.authored ?? null,
    }));
  } catch {
    recentAssessments = [];
  }

  let sessionDashboard: PhysioSessionWorkspaceData['sessionDashboard'] = {
    totalSessions: 0,
    avgPainDrop: null,
    readyOrNearDischarge: 0,
    topTemplate: 'No data yet',
    templateDistribution: [],
    painTrend: [],
    weeklyPainSparkline: [],
    templateOutcomeRanking: [],
    templateOutcomeRankingWindow: rankingWindow,
  };

  try {
    const reports = await listPatientCareReports(visit.patient.medplumPatientId, 60);
    const physioReports = reports.filter((report) => careReportCode(report) === 'physio-session-report');
    const totalSessions = physioReports.length;

    const templateCounts = new Map<SessionTemplate, number>([
      ['custom', 0],
      ['post_op_knee', 0],
      ['stroke_rehab', 0],
      ['low_back_pain', 0],
      ['geriatric_mobility', 0],
    ]);

    let painDropSum = 0;
    let painDropCount = 0;
    let readyOrNearDischarge = 0;
    const templateDropAgg = new Map<SessionTemplate, { sum: number; count: number }>([
      ['custom', { sum: 0, count: 0 }],
      ['post_op_knee', { sum: 0, count: 0 }],
      ['stroke_rehab', { sum: 0, count: 0 }],
      ['low_back_pain', { sum: 0, count: 0 }],
      ['geriatric_mobility', { sum: 0, count: 0 }],
    ]);
    const templateDropAgg7d = new Map<SessionTemplate, { sum: number; count: number }>([
      ['custom', { sum: 0, count: 0 }],
      ['post_op_knee', { sum: 0, count: 0 }],
      ['stroke_rehab', { sum: 0, count: 0 }],
      ['low_back_pain', { sum: 0, count: 0 }],
      ['geriatric_mobility', { sum: 0, count: 0 }],
    ]);
    const templateDropAgg30d = new Map<SessionTemplate, { sum: number; count: number }>([
      ['custom', { sum: 0, count: 0 }],
      ['post_op_knee', { sum: 0, count: 0 }],
      ['stroke_rehab', { sum: 0, count: 0 }],
      ['low_back_pain', { sum: 0, count: 0 }],
      ['geriatric_mobility', { sum: 0, count: 0 }],
    ]);
    const dailyDropAgg = new Map<string, { sum: number; count: number }>();

    const addTemplateDrop = (
      targetMap: Map<SessionTemplate, { sum: number; count: number }>,
      template: SessionTemplate,
      drop: number,
    ) => {
      const entry = targetMap.get(template);
      if (!entry) return;
      entry.sum += drop;
      entry.count += 1;
      targetMap.set(template, entry);
    };

    const painTrend = physioReports
      .slice(0, 6)
      .reverse()
      .map((report) => {
        const templateRaw = careReportComponentText(report, 'session-template') as SessionTemplate | null;
        if (templateRaw && templateCounts.has(templateRaw)) {
          templateCounts.set(templateRaw, (templateCounts.get(templateRaw) ?? 0) + 1);
        }

        const discharge = careReportComponentText(report, 'discharge-readiness');
        if (discharge === 'ready' || discharge === 'one_to_two_sessions') {
          readyOrNearDischarge += 1;
        }

        const painBefore = parseNumericComponent(careReportComponentText(report, 'pain-before'));
        const painAfter = parseNumericComponent(careReportComponentText(report, 'pain-after'));
        const drop = painBefore !== null && painAfter !== null ? painBefore - painAfter : null;

        if (drop !== null) {
          painDropSum += drop;
          painDropCount += 1;

          const templateForDrop =
            templateRaw && templateDropAgg.has(templateRaw)
              ? templateRaw
              : ('custom' as SessionTemplate);
          const templateStats = templateDropAgg.get(templateForDrop);
          if (templateStats) {
            templateStats.sum += drop;
            templateStats.count += 1;
            templateDropAgg.set(templateForDrop, templateStats);
          }
          if (isWithinWindow(report.effectiveDateTime, 7)) {
            addTemplateDrop(templateDropAgg7d, templateForDrop, drop);
          }
          if (isWithinWindow(report.effectiveDateTime, 30)) {
            addTemplateDrop(templateDropAgg30d, templateForDrop, drop);
          }

          if (report.effectiveDateTime) {
            const dateKey = new Date(report.effectiveDateTime).toISOString().slice(0, 10);
            const dayStats = dailyDropAgg.get(dateKey) ?? { sum: 0, count: 0 };
            dayStats.sum += drop;
            dayStats.count += 1;
            dailyDropAgg.set(dateKey, dayStats);
          }
        }

        return {
          dateLabel: report.effectiveDateTime
            ? new Date(report.effectiveDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : 'Unknown',
          painBefore,
          painAfter,
          drop,
        };
      });

    if (totalSessions > painTrend.length) {
      for (const report of physioReports.slice(6)) {
        const templateRaw = careReportComponentText(report, 'session-template') as SessionTemplate | null;
        if (templateRaw && templateCounts.has(templateRaw)) {
          templateCounts.set(templateRaw, (templateCounts.get(templateRaw) ?? 0) + 1);
        }

        const discharge = careReportComponentText(report, 'discharge-readiness');
        if (discharge === 'ready' || discharge === 'one_to_two_sessions') {
          readyOrNearDischarge += 1;
        }

        const painBefore = parseNumericComponent(careReportComponentText(report, 'pain-before'));
        const painAfter = parseNumericComponent(careReportComponentText(report, 'pain-after'));
        if (painBefore !== null && painAfter !== null) {
          const drop = painBefore - painAfter;
          painDropSum += drop;
          painDropCount += 1;

          const templateForDrop =
            templateRaw && templateDropAgg.has(templateRaw)
              ? templateRaw
              : ('custom' as SessionTemplate);
          const templateStats = templateDropAgg.get(templateForDrop);
          if (templateStats) {
            templateStats.sum += drop;
            templateStats.count += 1;
            templateDropAgg.set(templateForDrop, templateStats);
          }
          if (isWithinWindow(report.effectiveDateTime, 7)) {
            addTemplateDrop(templateDropAgg7d, templateForDrop, drop);
          }
          if (isWithinWindow(report.effectiveDateTime, 30)) {
            addTemplateDrop(templateDropAgg30d, templateForDrop, drop);
          }

          if (report.effectiveDateTime) {
            const dateKey = new Date(report.effectiveDateTime).toISOString().slice(0, 10);
            const dayStats = dailyDropAgg.get(dateKey) ?? { sum: 0, count: 0 };
            dayStats.sum += drop;
            dayStats.count += 1;
            dailyDropAgg.set(dateKey, dayStats);
          }
        }
      }
    }

    const templateDistribution = Array.from(templateCounts.entries())
      .map(([key, count]) => ({
        key,
        label: toTemplateLabel(key),
        count,
        percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);

    const weeklyPainSparkline: PhysioSessionWorkspaceData['sessionDashboard']['weeklyPainSparkline'] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const key = day.toISOString().slice(0, 10);
      const stats = dailyDropAgg.get(key);

      weeklyPainSparkline.push({
        label: day.toLocaleDateString('en-GB', { weekday: 'short' }),
        avgDrop: stats && stats.count > 0 ? Number((stats.sum / stats.count).toFixed(1)) : null,
      });
    }

    const toRanking = (source: Map<SessionTemplate, { sum: number; count: number }>) =>
      Array.from(source.entries())
        .map(([key, stats]) => ({
          key,
          label: toTemplateLabel(key),
          sessions: stats.count,
          avgDrop: stats.count > 0 ? Number((stats.sum / stats.count).toFixed(1)) : 0,
        }))
        .filter((entry) => entry.sessions > 0)
        .sort((a, b) => b.avgDrop - a.avgDrop);

    const rankingByWindow: Record<RankingWindow, PhysioSessionWorkspaceData['sessionDashboard']['templateOutcomeRanking']> = {
      '7d': toRanking(templateDropAgg7d),
      '30d': toRanking(templateDropAgg30d),
      all: toRanking(templateDropAgg),
    };

    const templateOutcomeRanking = rankingByWindow[rankingWindow] ?? rankingByWindow.all;

    sessionDashboard = {
      totalSessions,
      avgPainDrop: painDropCount > 0 ? Number((painDropSum / painDropCount).toFixed(1)) : null,
      readyOrNearDischarge,
      topTemplate: templateDistribution[0]?.label ?? 'No data yet',
      templateDistribution,
      painTrend,
      weeklyPainSparkline,
      templateOutcomeRanking,
      templateOutcomeRankingWindow: rankingWindow,
    };
  } catch {
    sessionDashboard = {
      totalSessions: 0,
      avgPainDrop: null,
      readyOrNearDischarge: 0,
      topTemplate: 'No data yet',
      templateDistribution: [],
      painTrend: [],
      weeklyPainSparkline: [],
      templateOutcomeRanking: [],
      templateOutcomeRankingWindow: rankingWindow,
    };
  }

  return {
    visit: {
      id: visit.id,
      code: visit.code,
      status: visit.status,
      effectiveState: state,
      scheduledTime: visit.scheduledTime,
      serviceName: visit.service.name,
      areaName: visit.area?.name ?? null,
      patient: {
        medplumPatientId: visit.patient.medplumPatientId,
        fullName: visit.patient.fullName,
        arabicName: visit.patient.arabicName,
        addressDetail: visit.patient.addressDetail,
        landmark: visit.patient.landmark,
      },
    },
    canDocumentSession: state === 'checked_in',
    recentAssessments,
    sessionDashboard,
  };
}
