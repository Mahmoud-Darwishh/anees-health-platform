/**
 * One-off backfill: link existing clinician Staff (doctor / nurse / physio) that
 * predate auto-provider-linking to a Provider profile, so they become assignable
 * on the dispatch board + visible in their "today" views. Idempotent + additive
 * (skips anyone already linked); safe to re-run.
 *
 *   npx ts-node --transpile-only --project scripts/tsconfig.json scripts/backfill-provider-links.ts
 */
import { PrismaClient, type StaffRole } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_TO_PROVIDER_ROLE: Partial<Record<StaffRole, { code: string; name: string }>> = {
  doctor: { code: 'RL-01', name: 'Doctor' },
  physiotherapist: { code: 'RL-02', name: 'Physiotherapist' },
  nurse: { code: 'RL-03', name: 'Nurse' },
};

async function main() {
  const clinicians = await prisma.staff.findMany({
    where: { role: { in: ['doctor', 'nurse', 'physiotherapist'] }, providerId: null },
    select: { id: true, name: true, email: true, role: true, tenantId: true },
  });

  console.log(`Found ${clinicians.length} clinician(s) without a provider link.`);
  let linked = 0;

  for (const staff of clinicians) {
    const mapping = ROLE_TO_PROVIDER_ROLE[staff.role];
    if (!mapping) continue;

    await prisma.$transaction(async (tx) => {
      const fresh = await tx.staff.findUnique({ where: { id: staff.id }, select: { providerId: true } });
      if (fresh?.providerId) return;

      const role = await tx.providerRole.upsert({
        where: { code: mapping.code },
        create: { code: mapping.code, name: mapping.name },
        update: {},
        select: { id: true },
      });

      const code = `PRV_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const provider = await tx.provider.create({
        data: {
          code,
          fullName: staff.name,
          roleId: role.id,
          email: staff.email,
          joiningDate: new Date(),
          baseRateEgp: 0,
          tenantId: staff.tenantId,
        },
        select: { id: true },
      });

      await tx.staff.update({ where: { id: staff.id }, data: { providerId: provider.id } });
      await tx.auditLog.create({
        data: {
          tableName: 'providers',
          recordId: provider.id,
          action: 'create',
          changedFields: { source: 'script.backfill_provider_links', staffId: staff.id, role: staff.role },
          changedBy: 'system:backfill',
        },
      });
      linked += 1;
      console.log(`  linked ${staff.role} ${staff.name} → provider ${provider.id}`);
    });
  }

  console.log(`Done. Linked ${linked} clinician(s).`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
