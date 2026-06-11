import 'server-only';

import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { listPatientGoalsFromMedplum } from '@/lib/medplum/goals';

export type PhysioPatientsFilter = 'active' | 'upcoming' | 'recently_discharged' | 'all';

export type PhysioPatientListItem = {
  id: string;
  medplumPatientId: string;
  code: string;
  fullName: string;
  arabicName: string | null;
  nextVisitDateIso: string | null;
  nextVisitLabel: string | null;
  activePlanName: string | null;
  completedSessions: number;
  totalSessions: number;
  progressLabel: string;
  statusTag: 'active' | 'upcoming' | 'recently_discharged';
  activeGoals: Array<{
    id: string;
    text: string;
    status: 'in_progress' | 'met' | 'discontinued';
    category: string | null;
    currentValue: string | null;
    targetValue: string | null;
    targetDateIso: string | null;
    measurementUnit: string | null;
  }>;
  goalSummary: {
    total: number;
    met: number;
    inProgress: number;
  };
};

export type PhysioPatientsData = {
  filter: PhysioPatientsFilter;
  query: string;
  items: PhysioPatientListItem[];
  warning: string | null;
};

const DEFAULT_GOAL_READ_MODE = 'fhir_with_fallback' as const;

type GoalReadMode = 'postgres' | 'fhir' | 'fhir_with_fallback';

function getGoalReadMode(): GoalReadMode {
  const raw = (process.env.FHIR_GOALS_READ_MODE ?? DEFAULT_GOAL_READ_MODE).trim().toLowerCase();
  if (raw === 'postgres' || raw === 'fhir' || raw === 'fhir_with_fallback') {
    return raw;
  }
  return DEFAULT_GOAL_READ_MODE;
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function trimQuery(value: string | undefined): string {
  return (value ?? '').trim();
}

function normalizeFilter(raw: string | undefined): PhysioPatientsFilter {
  if (raw === 'active' || raw === 'upcoming' || raw === 'recently_discharged' || raw === 'all') {
    return raw;
  }
  return 'active';
}

function resolveStatusTag(params: { activePlan: boolean; nextVisitDate: Date | null }): PhysioPatientListItem['statusTag'] {
  if (params.activePlan) {
    return 'active';
  }
  if (params.nextVisitDate) {
    return 'upcoming';
  }
  return 'recently_discharged';
}

function filterByStatus(
  statusTag: PhysioPatientListItem['statusTag'],
  filter: PhysioPatientsFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }
  return statusTag === filter;
}

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

type LegacyGoalRow = {
  id: string;
  patientId: string;
  text: string;
  status: 'in_progress' | 'met' | 'discontinued';
  category: string | null;
  currentValue: string | null;
  targetValue: string | null;
  targetDate: Date | null;
  measurementUnit: string | null;
};

type PhysioGoalRow = Omit<LegacyGoalRow, 'patientId'>;

async function loadPostgresGoals(patientIds: string[]): Promise<Map<string, PhysioGoalRow[]>> {
  const goalRows = await prisma.patientGoal.findMany({
    where: {
      patientId: {
        in: patientIds,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      id: true,
      patientId: true,
      text: true,
      status: true,
      category: true,
      currentValue: true,
      targetValue: true,
      targetDate: true,
      measurementUnit: true,
    },
  });

  return goalRows.reduce((acc, row) => {
    const goalRow: PhysioGoalRow = {
      id: row.id,
      text: row.text,
      status: row.status,
      category: row.category,
      currentValue: row.currentValue,
      targetValue: row.targetValue,
      targetDate: row.targetDate,
      measurementUnit: row.measurementUnit,
    };

    const existing = acc.get(row.patientId) ?? [];
    existing.push(goalRow);
    acc.set(row.patientId, existing);
    return acc;
  }, new Map<string, PhysioGoalRow[]>());
}

async function loadFhirGoals(
  patientMedplumId: string,
): Promise<PhysioGoalRow[]> {
  const goals = await listPatientGoalsFromMedplum(patientMedplumId);

  return goals.map((goal) => ({
    id: goal.id,
    text: goal.text,
    status: goal.status,
    category: goal.category,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    targetDate: goal.targetDate,
    measurementUnit: goal.measurementUnit,
  }));
}

export async function getPhysioPatientsData(params: {
  filter?: string;
  query?: string;
} = {}): Promise<PhysioPatientsData> {
  const { user: staff } = await requireStaffCan('workspace.physio.access');

  const filter = normalizeFilter(params.filter);
  const query = trimQuery(params.query);

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      providerId: true,
    },
  });

  if (!staffRecord) {
    return {
      filter,
      query,
      items: [],
      warning: 'Could not find your staff profile.',
    };
  }

  let caseScopedMedplumPatientIds: string[] = [];

  if (staff.staffRole === 'physiotherapist') {
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: staffRecord.id,
      name: staffRecord.name ?? staffRecord.email ?? `Staff ${staffRecord.id}`,
      email: staffRecord.email,
      role: staffRecord.role,
    });

    caseScopedMedplumPatientIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);

    if (caseScopedMedplumPatientIds.length === 0) {
      return {
        filter,
        query,
        items: [],
        warning: 'No assigned patients yet. Med Ops will assign your first case shortly.',
      };
    }
  }

  const textFilter = query
    ? {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' as const } },
          { arabicName: { contains: query, mode: 'insensitive' as const } },
          { code: { contains: query, mode: 'insensitive' as const } },
          { phone: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  const patients = await prisma.patient.findMany({
    where: {
      tenantId: sessionTenantId(staff),
      deletedAt: null,
      ...(staff.staffRole === 'physiotherapist'
        ? {
            medplumPatientId: {
              in: caseScopedMedplumPatientIds,
            },
          }
        : {
            visits: staffRecord.providerId
              ? {
                  some: {
                    providerId: staffRecord.providerId,
                  },
                }
              : undefined,
          }),
      ...textFilter,
    },
    select: {
      id: true,
      medplumPatientId: true,
      code: true,
      fullName: true,
      arabicName: true,
      carePlans: {
        where: {
          status: 'active',
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          planName: true,
          totalVisitsPlanned: true,
          visits: {
            where: {
              OR: [{ status: 'completed' }, { checkOutAt: { not: null } }],
            },
            select: {
              id: true,
            },
          },
        },
      },
      visits: {
        where: {
          ...(staffRecord.providerId ? { providerId: staffRecord.providerId } : {}),
          status: {
            in: ['scheduled', 'in_progress'],
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        take: 1,
        select: {
          scheduledDate: true,
        },
      },
      updatedAt: true,
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: 200,
  });

  const items = patients
    .filter((patient) => !!patient.medplumPatientId)
    .map((patient): PhysioPatientListItem => {
      const activePlan = patient.carePlans[0] ?? null;
      const nextVisitDate = patient.visits[0]?.scheduledDate ?? null;
      const completedSessions = activePlan?.visits.length ?? 0;
      const totalSessions = activePlan?.totalVisitsPlanned ?? 0;
      const statusTag = resolveStatusTag({
        activePlan: !!activePlan,
        nextVisitDate,
      });

      return {
        id: patient.id,
        medplumPatientId: patient.medplumPatientId as string,
        code: patient.code,
        fullName: patient.fullName,
        arabicName: patient.arabicName,
        nextVisitDateIso: toIsoOrNull(nextVisitDate),
        nextVisitLabel: nextVisitDate ? formatDateLabel(nextVisitDate) : null,
        activePlanName: activePlan?.planName ?? null,
        completedSessions,
        totalSessions,
        progressLabel: totalSessions > 0 ? `${completedSessions} / ${totalSessions}` : 'No active series',
        statusTag,
        activeGoals: [],
        goalSummary: {
          total: 0,
          met: 0,
          inProgress: 0,
        },
      };
    })
    .filter((item) => filterByStatus(item.statusTag, filter));

  if (items.length === 0) {
    return {
      filter,
      query,
      items,
      warning: null,
    };
  }

  const patientIds = items.map((item) => item.id);

  const goalReadMode = getGoalReadMode();

  let goalsByPatient = new Map<string, PhysioGoalRow[]>();
  let warning: string | null = null;

  if (goalReadMode === 'postgres') {
    try {
      goalsByPatient = await loadPostgresGoals(patientIds);
    } catch {
      goalsByPatient = new Map();
    }
  } else {
    try {
      const fhirResults = await Promise.all(
        items.map(async (item) => {
          try {
            return {
              patientId: item.id,
              goals: await loadFhirGoals(item.medplumPatientId),
            };
          } catch (error) {
            if (goalReadMode === 'fhir_with_fallback') {
              return {
                patientId: item.id,
                goals: [],
                error: error instanceof Error ? error.message : 'unknown error',
              };
            }

            throw error;
          }
        }),
      );

      const fallbackPatientIds = new Set<string>();

      for (const result of fhirResults) {
        if (result.goals.length > 0) {
          goalsByPatient.set(result.patientId, result.goals);
          continue;
        }

        if (goalReadMode === 'fhir_with_fallback') {
          fallbackPatientIds.add(result.patientId);
        }
      }

      if (goalReadMode === 'fhir_with_fallback' && fallbackPatientIds.size > 0) {
        const fallbackRows = await loadPostgresGoals(Array.from(fallbackPatientIds));
        for (const [patientId, rows] of fallbackRows.entries()) {
          goalsByPatient.set(patientId, rows);
        }

        warning = 'Goal data is being served from Postgres fallback while Medplum is unavailable or not yet populated for some patients.';
      }
    } catch {
      if (goalReadMode === 'fhir') {
        warning = 'Goal data is temporarily unavailable from Medplum.';
      } else {
        try {
          goalsByPatient = await loadPostgresGoals(patientIds);
          warning = 'Goal data is being served from Postgres fallback while Medplum is unavailable.';
        } catch {
          goalsByPatient = new Map();
          warning = 'Goal data is temporarily unavailable.';
        }
      }
    }
  }

  const itemsWithGoals = items.map((item) => {
    const patientGoals = goalsByPatient.get(item.id) ?? [];
    const activeGoals = patientGoals.slice(0, 4).map((goal) => ({
      id: goal.id,
      text: goal.text,
      status: goal.status,
      category: goal.category,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      targetDateIso: goal.targetDate ? goal.targetDate.toISOString() : null,
      measurementUnit: goal.measurementUnit,
    }));

    const met = patientGoals.filter((goal) => goal.status === 'met').length;
    const inProgress = patientGoals.filter((goal) => goal.status === 'in_progress').length;

    return {
      ...item,
      activeGoals,
      goalSummary: {
        total: patientGoals.length,
        met,
        inProgress,
      },
    };
  });

  return {
    filter,
    query,
    items: itemsWithGoals,
    warning,
  };
}
