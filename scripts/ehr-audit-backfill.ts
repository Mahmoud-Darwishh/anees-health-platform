import { prisma } from '../src/lib/db/prisma';

type BackfillModel = {
  label: string;
  auditTableName: string;
  listRecentRows: (since: Date) => Promise<Array<{ id: string; updatedAt: Date }>>;
};

type Args = {
  apply: boolean;
  lookbackDays: number;
  approvedBy: string | null;
};

const DEFAULT_LOOKBACK_DAYS = Number(process.env.EHR_AUDIT_BACKFILL_DAYS ?? '180');

const BACKFILL_MODELS: BackfillModel[] = [
  {
    label: 'Patient',
    auditTableName: 'patients',
    listRecentRows: (since) => prisma.patient.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    }),
  },
  {
    label: 'Visit',
    auditTableName: 'visits',
    listRecentRows: (since) => prisma.visit.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    }),
  },
  {
    label: 'CarePlan',
    auditTableName: 'care_plans',
    listRecentRows: (since) => prisma.carePlan.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    }),
  },
  {
    label: 'Invoice',
    auditTableName: 'invoices',
    listRecentRows: (since) => prisma.invoice.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    }),
  },
  {
    label: 'User',
    auditTableName: 'users',
    listRecentRows: (since) => prisma.user.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    }),
  },
];

function parseArgs(argv: string[]): Args {
  let apply = false;
  let lookbackDays = DEFAULT_LOOKBACK_DAYS;
  let approvedBy: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--lookback-days') {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        lookbackDays = Math.floor(value);
      }
      i += 1;
      continue;
    }
    if (arg === '--approved-by') {
      const value = argv[i + 1]?.trim();
      if (value) {
        approvedBy = value;
      }
      i += 1;
    }
  }

  return { apply, lookbackDays, approvedBy };
}

async function runModelBackfill(params: {
  model: BackfillModel;
  since: Date;
  apply: boolean;
  approvedBy: string | null;
}): Promise<{ model: string; changedRows: number; existingAuditRows: number; backfilledRows: number }> {
  const rows = await params.model.listRecentRows(params.since);
  if (rows.length === 0) {
    return {
      model: params.model.label,
      changedRows: 0,
      existingAuditRows: 0,
      backfilledRows: 0,
    };
  }

  const rowIds = rows.map((row) => row.id);
  const existingAudit = await prisma.auditLog.findMany({
    where: {
      tableName: params.model.auditTableName,
      recordId: { in: rowIds },
      changedAt: { gte: params.since },
    },
    select: {
      recordId: true,
    },
  });

  const auditedIdSet = new Set(existingAudit.map((entry) => entry.recordId));
  const missingRows = rows.filter((row) => !auditedIdSet.has(row.id));

  if (params.apply && missingRows.length > 0) {
    await prisma.auditLog.createMany({
      data: missingRows.map((row) => ({
        tableName: params.model.auditTableName,
        recordId: row.id,
        action: 'update',
        changedBy: `audit_backfill:${params.approvedBy ?? 'unknown'}`,
        changedAt: new Date(),
        changedFields: {
          backfill: true,
          backfillType: 'audit_gap',
          sourceModel: params.model.label,
          sourceUpdatedAt: row.updatedAt.toISOString(),
          approvalReference: params.approvedBy,
          note: 'Historical audit backfill for legacy coverage gaps',
        },
      })),
    });
  }

  return {
    model: params.model.label,
    changedRows: rows.length,
    existingAuditRows: existingAudit.length,
    backfilledRows: missingRows.length,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.apply && !args.approvedBy) {
    throw new Error('Backfill apply mode requires --approved-by <staff-id-or-ticket>.');
  }

  const since = new Date(Date.now() - args.lookbackDays * 24 * 60 * 60 * 1000);
  console.log(
    `ehr:audit-backfill: mode=${args.apply ? 'apply' : 'dry-run'} lookbackDays=${args.lookbackDays} approvedBy=${args.approvedBy ?? 'n/a'}`,
  );

  const rows = await Promise.all(
    BACKFILL_MODELS.map((model) => runModelBackfill({
      model,
      since,
      apply: args.apply,
      approvedBy: args.approvedBy,
    })),
  );

  console.table(rows);

  const totalBackfilled = rows.reduce((sum, row) => sum + row.backfilledRows, 0);
  if (!args.apply && totalBackfilled > 0) {
    console.error(
      `ehr:audit-backfill: ${totalBackfilled} record(s) need backfill. Re-run with --apply --approved-by <reference> after compliance approval.`,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
