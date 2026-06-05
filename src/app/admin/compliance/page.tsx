import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminComplianceWorkspacePage() {
  const user = await getStaffUser([
    'superadmin',
    'admin',
    'compliance_officer',
  ]);

  if (!user) {
    redirect('/admin/patients');
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentAudit, totalWeek, loginWeek, logoutWeek, exportWeek, deniedWeek, overrideWeek] = await Promise.all([
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
  ]);

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
