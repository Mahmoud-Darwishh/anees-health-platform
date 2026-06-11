import 'server-only';

import type { StaffRole } from '@prisma/client';
import { getSessionUser, isStaff, type SessionUser } from '@/lib/auth/rbac';
import { writeAuditLogBestEffort } from '@/lib/utils/audit';
import { can, type Decision, type StaffActor } from './can';
import type { ActionName } from './actions';
import { loadPolicyFacts, type PolicyInputContext } from './pip';

type StaffSessionUser = SessionUser & { staffId: string; staffRole: StaffRole };

type ResolveResult =
  | { ok: false; user: null; actor: null; decision: Decision; context: PolicyInputContext }
  | { ok: true; user: StaffSessionUser; actor: StaffActor; decision: Decision; context: PolicyInputContext };

async function auditDenied(params: {
  action: ActionName;
  user: StaffSessionUser | null;
  actor: StaffActor | null;
  decision: Decision;
  context: PolicyInputContext;
}): Promise<void> {
  const auditTarget = params.context.audit ?? {
    tableName: 'rbac',
    recordId: params.action,
  };

  await writeAuditLogBestEffort({
    tableName: auditTarget.tableName,
    recordId: auditTarget.recordId,
    action: 'access_denied',
    changedBy: params.user?.staffId ? `staff_${params.user.staffId}` : params.user?.id ?? null,
    changedFields: {
      action: params.action,
      reason: params.decision.reason,
      trace: params.decision.trace,
      staffRole: params.actor?.role ?? params.user?.staffRole ?? null,
      tenantId: params.actor?.tenantId ?? params.user?.tenantId ?? null,
    },
  });
}

async function resolve(action: ActionName, context: PolicyInputContext = {}): Promise<ResolveResult> {
  const user = await getSessionUser();
  if (!isStaff(user) || !user.staffRole || !user.staffId) {
    const decision = { allow: false, reason: 'not_staff', trace: ['session_staff'] };
    return { ok: false, user: null, actor: null, decision, context };
  }

  const staffUser = user as StaffSessionUser;
  const facts = await loadPolicyFacts(action, staffUser, context);
  const decision = can(facts.actor, action, facts.context);

  return {
    ok: true,
    user: staffUser,
    actor: facts.actor,
    decision,
    context: facts.context,
  };
}

export async function requireStaffCan(action: ActionName, context: PolicyInputContext = {}) {
  const result = await resolve(action, context);
  if (!result.ok || !result.decision.allow) {
    await auditDenied({
      action,
      user: result.user,
      actor: result.actor,
      decision: result.decision,
      context: result.context,
    });
    throw new Error('Unauthorized');
  }
  return { user: result.user, actor: result.actor, context: result.context };
}

export async function staffCan(action: ActionName, context: PolicyInputContext = {}): Promise<boolean> {
  const result = await resolve(action, context);
  return result.ok && result.decision.allow;
}

