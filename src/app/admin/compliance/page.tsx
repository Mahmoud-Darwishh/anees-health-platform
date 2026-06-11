import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { rolesForRoute } from '@/lib/auth/route-access';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { resolveApprovalTokenAction } from './actions';

export const dynamic = 'force-dynamic';

function tokenReason(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const value = (payload as Record<string, unknown>).reason;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function actorLabel(
  actorId: string | null | undefined,
  actorMap: Map<string, { name: string | null; email: string | null }>,
): string {
  if (!actorId) {
    return 'system';
  }
  const actor = actorMap.get(actorId);
  return actor?.name?.trim() || actor?.email?.trim() || actorId;
}

export default async function AdminComplianceWorkspacePage() {
  const user = await getStaffUser(rolesForRoute('/admin/compliance'));

  if (!user) {
    redirect('/admin/patients');
  }
  await requireStaffCan('audit_log.read', {
    audit: {
      tableName: 'audit_logs',
      recordId: 'admin_compliance',
    },
  });
  const tenantId = sessionTenantId(user);

  // This is an async Server Component: it renders once per request on the server,
  // so reading the current time here is intentional and safe (not a client re-render).
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentAudit, totalWeek, loginWeek, logoutWeek, exportWeek, deniedWeek, overrideWeek, pendingTokens] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { in: ['read', 'override', 'export', 'access_denied', 'login', 'logout'] } },
          { tableName: 'restricted_clinical_access' },
        ],
      },
      orderBy: { changedAt: 'desc' },
      take: 120,
      select: {
        id: true,
        tableName: true,
        recordId: true,
        action: true,
        changedBy: true,
        changedAt: true,
        changedFields: true,
      },
    }),
    prisma.auditLog.count({ where: { changedAt: { gte: since } } }),
    prisma.auditLog.count({ where: { action: 'login', changedAt: { gte: since } } }),
    prisma.auditLog.count({ where: { action: 'logout', changedAt: { gte: since } } }),
    prisma.auditLog.count({ where: { action: 'export', changedAt: { gte: since } } }),
    prisma.auditLog.count({ where: { action: 'access_denied', changedAt: { gte: since } } }),
    prisma.auditLog.count({ where: { action: 'override', changedAt: { gte: since } } }),
    prisma.destructiveApprovalToken.findMany({
      where: {
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        medplumPatientId: true,
        actionType: true,
        targetRecordId: true,
        requestedBy: true,
        createdAt: true,
        expiresAt: true,
        payload: true,
      },
    }),
  ]);

  const pendingPatientIds = Array.from(new Set(pendingTokens.map((token) => token.medplumPatientId)));
  const pendingPatients = pendingPatientIds.length
    ? await prisma.patient.findMany({
      where: {
        medplumPatientId: {
          in: pendingPatientIds,
        },
        ...(user.staffRole === 'superadmin' ? {} : { tenantId, deletedAt: null }),
      },
      select: {
        medplumPatientId: true,
        code: true,
        fullName: true,
      },
    })
    : [];

  const patientByMedplumId = new Map(
    pendingPatients.map((patient) => [
      patient.medplumPatientId,
      {
        code: patient.code,
        fullName: patient.fullName,
      },
    ]),
  );

  const visiblePendingTokens = pendingTokens.filter((token) => {
    if (user.staffRole === 'superadmin') {
      return true;
    }
    return patientByMedplumId.has(token.medplumPatientId);
  });

  const actorIds = Array.from(new Set(visiblePendingTokens.map((token) => token.requestedBy).filter(Boolean)));
  const actors = actorIds.length
    ? await prisma.staff.findMany({
      where: {
        id: {
          in: actorIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })
    : [];
  const actorMap = new Map(actors.map((actor) => [actor.id, { name: actor.name, email: actor.email }]));

  const restrictedEvents = recentAudit.filter((entry) => entry.tableName === 'restricted_clinical_access');
  const breakGlassEvents = restrictedEvents.filter((entry) => {
    if (entry.action === 'override') {
      return true;
    }

    if (!entry.changedFields || typeof entry.changedFields !== 'object' || Array.isArray(entry.changedFields)) {
      return false;
    }

    const fields = entry.changedFields as Record<string, unknown>;
    return fields.accessType === 'break_glass';
  });

  return (
    <div className="d-grid gap-3">
      <div className="card bg-white">
        <div className="card-header">
          <h1 className="h5 mb-0">Compliance Workspace</h1>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Audit rows (7d)</div>
                <div className="h5 mb-0">{totalWeek}</div>
              </div>
            </div>
            <div className="col-md-2 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Restricted access</div>
                <div className="h5 mb-0">{restrictedEvents.length}</div>
              </div>
            </div>
            <div className="col-md-2 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Break-glass</div>
                <div className="h5 mb-0">{breakGlassEvents.length}</div>
              </div>
            </div>
            <div className="col-md-2 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Exports</div>
                <div className="h5 mb-0">{exportWeek}</div>
              </div>
            </div>
            <div className="col-md-2 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Access denied</div>
                <div className="h5 mb-0">{deniedWeek}</div>
              </div>
            </div>
            <div className="col-md-2 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Overrides</div>
                <div className="h5 mb-0">{overrideWeek}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 small text-muted">
            Session controls last 7d: login {loginWeek} · logout {logoutWeek}
          </div>
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">Pending destructive approvals</h2>
          <span className="text-muted small">{visiblePendingTokens.length} pending</span>
        </div>
        <div className="card-body">
          {visiblePendingTokens.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">No pending destructive-approval tokens.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Type</th>
                    <th>Patient</th>
                    <th>Requester</th>
                    <th>Reason</th>
                    <th>Expires</th>
                    <th className="text-end">Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePendingTokens.map((token) => {
                    const patient = patientByMedplumId.get(token.medplumPatientId);
                    const reason = tokenReason(token.payload);
                    return (
                      <tr key={token.id}>
                        <td>{new Date(token.createdAt).toLocaleString('en-GB')}</td>
                        <td>{token.actionType.replace(/_/g, ' ')}</td>
                        <td>
                          <div>{patient?.fullName ?? 'Unknown patient'}</div>
                          <div className="small text-muted">{patient?.code ?? token.medplumPatientId}</div>
                        </td>
                        <td>{actorLabel(token.requestedBy, actorMap)}</td>
                        <td>{reason ?? 'No reason captured.'}</td>
                        <td>{new Date(token.expiresAt).toLocaleString('en-GB')}</td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            <form action={resolveApprovalTokenAction}>
                              <input type="hidden" name="approvalTokenId" value={token.id} />
                              <input type="hidden" name="decision" value="approve" />
                              <button type="submit" className="btn btn-sm btn-outline-success">Approve</button>
                            </form>
                            <form action={resolveApprovalTokenAction}>
                              <input type="hidden" name="approvalTokenId" value={token.id} />
                              <input type="hidden" name="decision" value="reject" />
                              <button type="submit" className="btn btn-sm btn-outline-danger">Reject</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">Recent compliance events</h2>
          <span className="text-muted small">{recentAudit.length} records</span>
        </div>
        <div className="card-body">
          {recentAudit.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">No compliance events found yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Table</th>
                    <th>Record</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudit.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.changedAt).toLocaleString('en-GB')}</td>
                      <td className="text-capitalize">{entry.action.replace('_', ' ')}</td>
                      <td>{entry.tableName}</td>
                      <td>{entry.recordId}</td>
                      <td>{entry.changedBy ?? 'system'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
