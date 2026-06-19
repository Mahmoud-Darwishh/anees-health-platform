import 'server-only';

import type { StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/app-logger';

/**
 * Map a field-clinician StaffRole → its ProviderRole (seeded codes RL-01..03).
 * Only these roles deliver visits, so only they need a Provider profile.
 */
const ROLE_TO_PROVIDER_ROLE: Partial<Record<StaffRole, { code: string; name: string }>> = {
  doctor: { code: 'RL-01', name: 'Doctor' },
  physiotherapist: { code: 'RL-02', name: 'Physiotherapist' },
  nurse: { code: 'RL-03', name: 'Nurse' },
};

/**
 * Ensure a clinician Staff member is linked to a Provider profile, creating one
 * if needed. This is the thread that makes onboarding → dispatch → clinician-app
 * work: `Visit.providerId` is a Provider, and the dispatch board + the clinician
 * "today" views resolve a clinician's visits through `Staff.providerId`.
 *
 * Idempotent (returns the existing providerId if already linked) and best-effort
 * (logs + returns null on failure rather than throwing, so staff onboarding is
 * never blocked by this). No-op for non-clinical roles. Base pay rate is 0 —
 * clinician pay is manual at launch.
 */
export async function ensureProviderForStaff(staffId: string, changedBy?: string | null): Promise<string | null> {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, email: true, role: true, providerId: true, tenantId: true },
    });
    if (!staff) return null;
    if (staff.providerId) return staff.providerId;

    const mapping = ROLE_TO_PROVIDER_ROLE[staff.role];
    if (!mapping) return null; // not a field clinician — no Provider needed

    return await prisma.$transaction(async (tx) => {
      // Re-check inside the txn to avoid a double-create race.
      const fresh = await tx.staff.findUnique({ where: { id: staff.id }, select: { providerId: true } });
      if (fresh?.providerId) return fresh.providerId;

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
          changedFields: { source: 'staff.ensure_provider', staffId: staff.id, role: staff.role },
          changedBy: changedBy ?? `staff_${staff.id}`,
        },
      });

      return provider.id;
    });
  } catch (error) {
    logger.error('ensureProviderForStaff failed', {
      staffId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}
