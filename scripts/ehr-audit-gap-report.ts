import { prisma } from '../src/lib/db/prisma';

type AuditedModel = {
  label: string;
  tableNames: string[];
  countChanged: (since: Date) => Promise<number>;
};

const LOOKBACK_DAYS = Number(process.env.EHR_AUDIT_GAP_DAYS ?? '7');

const auditedModels: AuditedModel[] = [
  {
    label: 'Patient',
    tableNames: ['patients', 'MedplumPatient', 'PatientGeoPolicy'],
    countChanged: (since) => prisma.patient.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'Visit',
    tableNames: ['visits', 'VisitWorkflow', 'MedplumEncounter'],
    countChanged: (since) => prisma.visit.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'CarePlan',
    tableNames: ['care_plans', 'MedplumCarePlan'],
    countChanged: (since) => prisma.carePlan.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'Invoice',
    tableNames: ['invoices'],
    countChanged: (since) => prisma.invoice.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'Payment',
    tableNames: ['payments'],
    countChanged: (since) => prisma.payment.count({ where: { paymentDate: { gte: since } } }),
  },
  {
    label: 'Staff',
    tableNames: ['staff', 'MedplumPractitioner'],
    countChanged: (since) => prisma.staff.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'User',
    tableNames: ['users'],
    countChanged: (since) => prisma.user.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'OnlineBooking',
    tableNames: ['online_bookings'],
    countChanged: (since) => prisma.onlineBooking.count({ where: { updatedAt: { gte: since } } }),
  },
  {
    label: 'PatientGoal',
    tableNames: ['patient_goals', 'MedplumGoal'],
    countChanged: (since) => prisma.patientGoal.count({ where: { updatedAt: { gte: since } } }),
  },
];

async function main(): Promise<void> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const rows = await Promise.all(
    auditedModels.map(async (model) => {
      const [changedRows, auditRows] = await Promise.all([
        model.countChanged(since),
        prisma.auditLog.count({
          where: {
            tableName: { in: model.tableNames },
            changedAt: { gte: since },
          },
        }),
      ]);
      return {
        model: model.label,
        changedRows,
        auditRows,
        status: changedRows === 0 || auditRows > 0 ? 'ok' : 'gap',
      };
    }),
  );

  console.table(rows);
  const gaps = rows.filter((row) => row.status === 'gap');
  if (gaps.length > 0) {
    console.error(`ehr:audit-gap: ${gaps.length} audited model(s) changed without matching AuditLog rows.`);
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
