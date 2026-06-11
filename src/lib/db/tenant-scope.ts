import 'server-only';

import type { SessionUser } from '@/lib/auth/rbac';

export const DEFAULT_TENANT_ID = 'platform';

type TenantScopedWhere = {
  tenantId?: string;
  AND?: unknown;
};

export function sessionTenantId(user: Pick<SessionUser, 'tenantId'> | null | undefined): string {
  return user?.tenantId?.trim() || DEFAULT_TENANT_ID;
}

export function tenantWhere<TWhere extends TenantScopedWhere>(
  user: Pick<SessionUser, 'tenantId'> | null | undefined,
  where?: TWhere,
): TWhere & { tenantId: string } {
  return {
    ...(where ?? {}),
    tenantId: sessionTenantId(user),
  } as TWhere & { tenantId: string };
}

export function nestedPatientTenantWhere<TWhere extends object>(
  user: Pick<SessionUser, 'tenantId'> | null | undefined,
  where?: TWhere,
) {
  return {
    ...(where ?? {}),
    patient: {
      tenantId: sessionTenantId(user),
    },
  };
}

export function assertTenantMatch(params: {
  actorTenantId: string | null | undefined;
  targetTenantId: string | null | undefined;
  allowCrossTenant?: boolean;
}): void {
  const actorTenantId = params.actorTenantId?.trim() || DEFAULT_TENANT_ID;
  const targetTenantId = params.targetTenantId?.trim();
  if (!targetTenantId) {
    throw new Error('Target tenant could not be resolved.');
  }
  if (actorTenantId !== targetTenantId && params.allowCrossTenant !== true) {
    throw new Error('Cross-tenant access denied.');
  }
}

