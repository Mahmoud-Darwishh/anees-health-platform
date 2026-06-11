import type { StaffRole } from '@prisma/client';
import {
  canSignClinical,
  hasValidClinicalLicense,
  isCaseScopedClinicalRole,
  type StaffLicenseSnapshot,
} from '@/lib/auth/rbac';
import { ACTIONS, type ActionDefinition, type ActionName } from './actions';
import { roleAllowsAction } from './matrix';

export type StaffActor = {
  kind: 'staff';
  staffId: string;
  role: StaffRole;
  tenantId: string;
  license?: StaffLicenseSnapshot | null;
};

export type DecisionContext = {
  inCaseScope?: boolean;
  targetTenantId?: string | null;
  allowCrossTenant?: boolean;
  at?: Date;
  audit?: {
    tableName: string;
    recordId: string;
  };
};

export type Decision = {
  allow: boolean;
  reason: string;
  trace: string[];
};

export function can(actor: StaffActor, action: ActionName, context: DecisionContext = {}): Decision {
  const trace: string[] = [];
  const at = context.at ?? new Date();
  const def: ActionDefinition | undefined = ACTIONS[action];

  trace.push('known_action');
  if (!def) {
    return { allow: false, reason: 'unknown_action', trace };
  }

  trace.push('role_allows_action');
  if (!roleAllowsAction(actor.role, action)) {
    return { allow: false, reason: 'role_not_permitted', trace };
  }

  if (context.targetTenantId !== undefined) {
    trace.push('tenant_boundary');
    if (!context.targetTenantId) {
      return { allow: false, reason: 'tenant_unknown', trace };
    }
    const crossTenantAllowed = context.allowCrossTenant === true && actor.role === 'superadmin';
    if (actor.tenantId !== context.targetTenantId && !crossTenantAllowed) {
      return { allow: false, reason: 'tenant_mismatch', trace };
    }
  }

  if (def.requiresLicense) {
    trace.push('license_valid');
    const snapshot: StaffLicenseSnapshot = { ...(actor.license ?? {}), staffRole: actor.role };
    const valid = def.discipline
      ? canSignClinical(snapshot, def.discipline, at)
      : hasValidClinicalLicense(snapshot, at);
    if (!valid) {
      return { allow: false, reason: 'license_invalid', trace };
    }
  }

  if (def.requiresCaseScope && isCaseScopedClinicalRole(actor.role)) {
    trace.push('case_scope');
    if (context.inCaseScope !== true) {
      return { allow: false, reason: 'out_of_case_scope', trace };
    }
  }

  trace.push('allow');
  return { allow: true, reason: 'ok', trace };
}
