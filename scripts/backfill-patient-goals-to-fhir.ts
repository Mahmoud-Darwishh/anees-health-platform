import { loadEnvConfig } from '@next/env';
import { ClientStorage, MedplumClient, MemoryStorage } from '@medplum/core';
import { PrismaClient } from '@prisma/client';
import { getMedplumConfig } from '../src/lib/medplum/config';
import { MEDPLUM_CODE_SYSTEMS } from '../src/lib/medplum/constants';

type GoalResource = {
  resourceType: 'Goal';
  id?: string;
  identifier?: Array<{ system?: string; value?: string }>;
  lifecycleStatus?:
    | 'proposed'
    | 'planned'
    | 'accepted'
    | 'active'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'entered-in-error'
    | 'rejected';
  achievementStatus?: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  };
  category?: Array<{
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  }>;
  description?: { text?: string };
  subject?: { reference?: string };
  startDate?: string;
  statusDate?: string;
  expressedBy?: { reference?: string; display?: string };
  target?: Array<{ measure?: { text?: string }; detailString?: string; dueDate?: string }>;
  note?: Array<{
    authorReference?: { reference?: string; display?: string };
    time?: string;
    text?: string;
  }>;
};

type BackfillRow = {
  id: string;
  fhirGoalId: string | null;
  text: string;
  category: string | null;
  baselineValue: string | null;
  currentValue: string | null;
  targetValue: string | null;
  measurementUnit: string | null;
  targetDate: Date | null;
  status: 'in_progress' | 'met' | 'discontinued';
  metAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    medplumPatientId: string | null;
  };
  author: {
    id: string;
    name: string | null;
    email: string | null;
    medplumPractitionerId: string | null;
  };
};

function toLifecycleStatus(status: BackfillRow['status']): GoalResource['lifecycleStatus'] {
  if (status === 'met') return 'completed';
  if (status === 'discontinued') return 'cancelled';
  return 'active';
}

function toAchievementStatus(status: BackfillRow['status']): GoalResource['achievementStatus'] {
  if (status === 'met') {
    return {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
          code: 'achieved',
          display: 'Achieved',
        },
      ],
      text: 'Achieved',
    };
  }

  if (status === 'discontinued') {
    return {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
          code: 'not-achieved',
          display: 'Not Achieved',
        },
      ],
      text: 'Not achieved',
    };
  }

  return {
    coding: [
      {
        system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
        code: 'in-progress',
        display: 'In Progress',
      },
    ],
    text: 'In progress',
  };
}

function buildGoalNote(row: BackfillRow): string {
  const lines: string[] = [];

  if (row.category) lines.push(`Category: ${row.category}`);
  if (row.baselineValue) lines.push(`Baseline: ${row.baselineValue}`);
  if (row.currentValue) lines.push(`Current: ${row.currentValue}`);
  if (row.targetValue) lines.push(`Target: ${row.targetValue}`);
  if (row.measurementUnit) lines.push(`Unit: ${row.measurementUnit}`);
  if (row.status === 'met' && row.metAt) lines.push(`Met at: ${row.metAt.toISOString()}`);

  return lines.join('\n');
}

function buildGoalResource(params: {
  row: BackfillRow;
  authorReference?: string;
  authorDisplay: string;
}): GoalResource {
  const { row } = params;
  const noteText = buildGoalNote(row);

  return {
    resourceType: 'Goal',
    identifier: [
      {
        system: MEDPLUM_CODE_SYSTEMS.patientGoalId,
        value: row.id,
      },
    ],
    lifecycleStatus: toLifecycleStatus(row.status),
    achievementStatus: toAchievementStatus(row.status),
    category: row.category
      ? [
          {
            coding: [
              {
                system: MEDPLUM_CODE_SYSTEMS.reportType,
                code: `patient-goal-${row.category}`,
                display: row.category,
              },
            ],
            text: row.category,
          },
        ]
      : undefined,
    description: { text: row.text },
    subject: { reference: `Patient/${row.patient.medplumPatientId}` },
    startDate: row.createdAt.toISOString(),
    statusDate: (row.metAt ?? row.updatedAt).toISOString(),
    expressedBy: params.authorReference
      ? {
          reference: params.authorReference,
          display: params.authorDisplay,
        }
      : undefined,
    target:
      row.targetValue || row.targetDate || row.measurementUnit
        ? [
            {
              measure: row.measurementUnit ? { text: row.measurementUnit } : undefined,
              detailString: row.targetValue ?? undefined,
              dueDate: row.targetDate?.toISOString(),
            },
          ]
        : undefined,
    note: noteText
      ? [
          {
            authorReference: params.authorReference
              ? {
                  reference: params.authorReference,
                  display: params.authorDisplay,
                }
              : undefined,
            time: row.updatedAt.toISOString(),
            text: noteText,
          },
        ]
      : undefined,
  };
}

async function createBackfillMedplumClient(): Promise<MedplumClient> {
  const config = getMedplumConfig();
  const client = new MedplumClient({
    baseUrl: config.baseUrl,
    cacheTime: 0,
    logLevel: process.env.NODE_ENV === 'development' ? 'basic' : 'none',
    storage: new ClientStorage(new MemoryStorage()),
  });

  await client.startClientLogin(config.clientId, config.clientSecret);
  return client;
}

async function upsertGoalForBackfill(
  medplum: MedplumClient,
  params: {
    row: BackfillRow;
    authorReference?: string;
    authorDisplay: string;
  },
): Promise<GoalResource> {
  const draft = buildGoalResource(params);

  const existing = (await medplum.searchOne('Goal', {
    identifier: `${MEDPLUM_CODE_SYSTEMS.patientGoalId}|${params.row.id}`,
  })) as GoalResource | null;

  const saved = existing?.id
    ? ((await medplum.updateResource({
        ...existing,
        ...draft,
        id: existing.id,
      } as never)) as GoalResource)
    : ((await medplum.createResource(draft as never)) as GoalResource);

  if (!saved.id) {
    throw new Error('FHIR Goal id missing after upsert');
  }

  return saved;
}

function readFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : null;
}

function asPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  const prisma = new PrismaClient();
  const apply = readFlag('apply');
  const medplum = apply ? await createBackfillMedplumClient() : null;
  const limit = asPositiveInt(readArg('limit'), 250);
  const patientIdFilter = readArg('patientId');

  const rows = (await prisma.patientGoal.findMany({
    where: {
      fhirGoalId: null,
      patientId: patientIdFilter ?? undefined,
      patient: {
        medplumPatientId: {
          not: null,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    take: limit,
    select: {
      id: true,
      fhirGoalId: true,
      text: true,
      category: true,
      baselineValue: true,
      currentValue: true,
      targetValue: true,
      measurementUnit: true,
      targetDate: true,
      status: true,
      metAt: true,
      createdAt: true,
      updatedAt: true,
      patient: {
        select: {
          medplumPatientId: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          medplumPractitionerId: true,
        },
      },
    },
  })) as BackfillRow[];

  if (rows.length === 0) {
    console.log('No patient goals pending FHIR linkage.');
    await prisma.$disconnect();
    return;
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        selected: rows.length,
        limit,
        patientIdFilter,
      },
      null,
      2,
    ),
  );

  let synced = 0;
  let skipped = 0;
  const failures: Array<{ goalId: string; error: string }> = [];

  for (const row of rows) {
    if (!row.patient.medplumPatientId) {
      skipped += 1;
      continue;
    }

    const authorReference = row.author.medplumPractitionerId
      ? `Practitioner/${row.author.medplumPractitionerId}`
      : undefined;
    const authorDisplay = row.author.name ?? row.author.email ?? `Staff ${row.author.id}`;

    if (!apply) {
      console.log(`[DRY-RUN] would sync goal ${row.id} -> Patient/${row.patient.medplumPatientId}`);
      synced += 1;
      continue;
    }

    try {
      if (!medplum) {
        throw new Error('Medplum client not initialized for apply mode.');
      }

      const goal = await upsertGoalForBackfill(medplum, {
        row,
        authorReference,
        authorDisplay,
      });

      if (!goal.id) {
        throw new Error('FHIR Goal id missing after upsert');
      }

      await prisma.patientGoal.update({
        where: { id: row.id },
        data: { fhirGoalId: goal.id },
      });

      synced += 1;
      console.log(`[APPLY] synced goal ${row.id} -> Goal/${goal.id}`);
    } catch (error) {
      failures.push({
        goalId: row.id,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      console.error(`[ERROR] goal ${row.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        processed: rows.length,
        synced,
        skipped,
        failed: failures.length,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    console.log(JSON.stringify({ failures }, null, 2));
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Backfill failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
