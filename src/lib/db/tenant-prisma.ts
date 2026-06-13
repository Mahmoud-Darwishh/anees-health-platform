import 'server-only';

import type { SessionUser } from '@/lib/auth/rbac';
import { prisma } from './prisma';
import { DEFAULT_TENANT_ID, sessionTenantId } from './tenant-scope';

/**
 * Tenant-scoped Prisma client.
 *
 * The base `prisma` singleton leaves tenant isolation to each caller — a query
 * that forgets `where: { tenantId }` is a silent cross-tenant PHI leak (P0).
 * This factory returns a `$extends`-wrapped client that auto-injects the active
 * tenant on every operation against a tenant-scoped model, so it is impossible
 * to forget:
 *
 *   - list / aggregate / many-mutation ops  → `tenantId` is forced into `where`
 *   - create ops                            → `tenantId` is stamped into `data`
 *   - by-id ops (findUnique/update/delete)  → ownership is checked first; a row
 *                                             from another tenant reads as `null`
 *                                             (find) or throws (mutate)
 *
 * Usage:
 *   const db = tenantDb(user);              // or tenantScopedPrisma(tenantId)
 *   await db.visit.findMany({ where: { status: 'scheduled' } }); // tenant-safe
 *
 * Cross-tenant work (platform admin, migrations) must use the raw `prisma`
 * client deliberately, paired with an explicit `assertTenantMatch`.
 */

/** Prisma models that carry a `tenantId` column and must always be tenant-scoped. */
const TENANT_SCOPED_MODELS = new Set<string>([
  'CarePlan',
  'Claim',
  'ControlledSubstanceLedger',
  'Coverage',
  'Invoice',
  'OnlineBooking',
  'Patient',
  'PriorAuth',
  'Provider',
  'Staff',
  'Visit',
]);

// `where`-accepting operations — inject the tenant filter there.
const WHERE_SCOPED_OPS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

// Row-creating operations — stamp the tenant into the payload.
const CREATE_OPS = new Set<string>(['create', 'createMany', 'createManyAndReturn']);

// Unique/by-id operations — `tenantId` can't go in a unique `where`, so ownership
// is enforced with a pre-check instead.
const FIND_UNIQUE_OPS = new Set<string>(['findUnique', 'findUniqueOrThrow']);
const MUTATE_UNIQUE_OPS = new Set<string>(['update', 'delete']);

type LooseArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  [key: string]: unknown;
};

type FindFirstDelegate = { findFirst: (args: unknown) => Promise<unknown> };

function delegateFor(model: string): FindFirstDelegate {
  const accessor = model.charAt(0).toLowerCase() + model.slice(1);
  return (prisma as unknown as Record<string, FindFirstDelegate>)[accessor];
}

/** True when a row matching `where` exists inside `tenantId`. */
async function ownsRow(model: string, where: Record<string, unknown> | undefined, tenantId: string): Promise<boolean> {
  if (!where) {
    return false;
  }
  const row = await delegateFor(model).findFirst({
    where: { ...where, tenantId },
    select: { tenantId: true },
  });
  return Boolean(row);
}

export function tenantScopedPrisma(tenantId: string | null | undefined) {
  const tenant = (tenantId ?? '').trim() || DEFAULT_TENANT_ID;

  return prisma.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const next = args as LooseArgs;

          if (WHERE_SCOPED_OPS.has(operation)) {
            next.where = { ...next.where, tenantId: tenant };
            return query(next);
          }

          if (CREATE_OPS.has(operation)) {
            if (Array.isArray(next.data)) {
              next.data = next.data.map((row) => ({ tenantId: tenant, ...row }));
            } else if (next.data) {
              next.data = { tenantId: tenant, ...next.data };
            }
            return query(next);
          }

          if (FIND_UNIQUE_OPS.has(operation)) {
            const owned = await ownsRow(model, next.where, tenant);
            if (owned) {
              return query(next);
            }
            if (operation === 'findUniqueOrThrow') {
              throw new Error(`${model} not found in tenant "${tenant}".`);
            }
            return null;
          }

          if (MUTATE_UNIQUE_OPS.has(operation)) {
            const owned = await ownsRow(model, next.where, tenant);
            if (!owned) {
              throw new Error(`Cross-tenant ${operation} on ${model} blocked (tenant "${tenant}").`);
            }
            return query(next);
          }

          if (operation === 'upsert') {
            // upsert's unique `where` can't be tenant-filtered safely; no tenant
            // model uses it today. Route through create + updateMany instead.
            throw new Error(
              `upsert on tenant-scoped model ${model} is not supported via the tenant-scoped client.`,
            );
          }

          return query(next);
        },
      },
    },
  });
}

/** Convenience wrapper: resolve the tenant from the current session user. */
export function tenantDb(user: Pick<SessionUser, 'tenantId'> | null | undefined) {
  return tenantScopedPrisma(sessionTenantId(user));
}
