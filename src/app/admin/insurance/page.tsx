import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { rolesForRoute } from '@/lib/auth/route-access';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';

export const dynamic = 'force-dynamic';

export default async function AdminInsuranceWorkspacePage() {
  const user = await getStaffUser(rolesForRoute('/admin/insurance'));

  if (!user) {
    redirect('/admin/patients');
  }
  await requireStaffCan('insurance.read', {
    audit: {
      tableName: 'insurance',
      recordId: 'admin_insurance',
    },
  });
  const tenantId = sessionTenantId(user);

  const [insurerCount, coverageCount, priorAuthCount, claimCount, recentClaims, recentPriorAuths, recentCoverages] = await Promise.all([
    prisma.insurerProfile.count({ where: { isActive: true } }),
    prisma.coverage.count({ where: { tenantId } }),
    prisma.priorAuth.count({ where: { tenantId } }),
    prisma.claim.count({ where: { tenantId } }),
    prisma.claim.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        code: true,
        status: true,
        totalAmountEgp: true,
        approvedAmountEgp: true,
        createdAt: true,
        patient: { select: { code: true, fullName: true } },
        insurerProfile: { select: { name: true } },
      },
    }),
    prisma.priorAuth.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        requestedFor: true,
        submittedAt: true,
        patient: { select: { code: true, fullName: true } },
        insurerProfile: { select: { name: true } },
      },
    }),
    prisma.coverage.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        memberId: true,
        policyNumber: true,
        status: true,
        expiresAt: true,
        patient: { select: { code: true, fullName: true } },
        insurerProfile: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="d-grid gap-3">
      <div className="card bg-white">
        <div className="card-header">
          <h1 className="h5 mb-0">Insurance Workspace</h1>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Active insurers</div>
                <div className="h5 mb-0">{insurerCount}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Coverages</div>
                <div className="h5 mb-0">{coverageCount}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Prior auths</div>
                <div className="h5 mb-0">{priorAuthCount}</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="border rounded p-2 h-100">
                <div className="small text-muted">Claims</div>
                <div className="h5 mb-0">{claimCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">Recent claims</h2>
          <span className="text-muted small">{recentClaims.length} records</span>
        </div>
        <div className="card-body">
          {recentClaims.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">No claims yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Patient</th>
                    <th>Insurer</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td>
                        <div className="fw-semibold">{claim.code}</div>
                        <div className="small text-muted">{new Date(claim.createdAt).toLocaleString('en-GB')}</div>
                      </td>
                      <td>{claim.patient.fullName} ({claim.patient.code})</td>
                      <td>{claim.insurerProfile?.name ?? '—'}</td>
                      <td className="text-capitalize">{claim.status.replace('_', ' ')}</td>
                      <td>
                        {Number(claim.totalAmountEgp).toFixed(2)} EGP
                        {claim.approvedAmountEgp ? ` / approved ${Number(claim.approvedAmountEgp).toFixed(2)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">Recent prior authorizations</h2>
          <span className="text-muted small">{recentPriorAuths.length} records</span>
        </div>
        <div className="card-body">
          {recentPriorAuths.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">No prior authorizations yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Patient</th>
                    <th>Insurer</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPriorAuths.map((auth) => (
                    <tr key={auth.id}>
                      <td>{auth.referenceNumber ?? auth.id}</td>
                      <td>{auth.patient.fullName} ({auth.patient.code})</td>
                      <td>{auth.insurerProfile?.name ?? '—'}</td>
                      <td className="text-capitalize">{auth.status.replace('_', ' ')}</td>
                      <td>{auth.submittedAt ? new Date(auth.submittedAt).toLocaleString('en-GB') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">Recent coverages</h2>
          <span className="text-muted small">{recentCoverages.length} records</span>
        </div>
        <div className="card-body">
          {recentCoverages.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">No coverage records yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Insurer</th>
                    <th>Member / Policy</th>
                    <th>Status</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCoverages.map((coverage) => (
                    <tr key={coverage.id}>
                      <td>{coverage.patient.fullName} ({coverage.patient.code})</td>
                      <td>{coverage.insurerProfile?.name ?? '—'}</td>
                      <td>{coverage.memberId ?? '—'} / {coverage.policyNumber ?? '—'}</td>
                      <td className="text-capitalize">{coverage.status}</td>
                      <td>{coverage.expiresAt ? new Date(coverage.expiresAt).toLocaleDateString('en-GB') : '—'}</td>
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
