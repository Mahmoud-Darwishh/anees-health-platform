import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { rolesForRoute } from '@/lib/auth/route-access';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';

export const dynamic = 'force-dynamic';

type DisputeQueueRow = {
  id: string;
  code: string;
  status: string;
  state: string | null;
  scheduledDate: Date;
  scheduledTime: string | null;
  primaryDisruptionCode: string | null;
  updatedAt: Date;
  providerFullName: string | null;
  medplumPatientId: string | null;
  patientFullName: string;
  patientArabicName: string | null;
};

export default async function AdminOpsDisputesPage() {
  const user = await getStaffUser(rolesForRoute('/admin/ops/disputes'));
  if (!user) {
    redirect('/admin/patients');
  }
  await requireStaffCan('ops.disputes.read', {
    audit: {
      tableName: 'visits',
      recordId: 'admin_ops_disputes',
    },
  });
  const tenantId = sessionTenantId(user);

  const rows = await prisma.visit.findMany({
    where: {
      tenantId,
      patient: { is: { deletedAt: null, tenantId } },
      OR: [{ state: 'disputed' }, { primaryDisruptionCode: { not: null } }],
    },
    orderBy: [{ updatedAt: 'desc' }, { scheduledDate: 'desc' }],
    take: 100,
    select: {
      id: true,
      code: true,
      status: true,
      state: true,
      scheduledDate: true,
      scheduledTime: true,
      primaryDisruptionCode: true,
      updatedAt: true,
      patient: { select: { fullName: true, arabicName: true, medplumPatientId: true } },
      provider: { select: { fullName: true } },
    },
  });

  const disputedVisits: DisputeQueueRow[] = rows.map((visit) => ({
    id: visit.id,
    code: visit.code,
    status: visit.status,
    state: visit.state,
    scheduledDate: visit.scheduledDate,
    scheduledTime: visit.scheduledTime,
    primaryDisruptionCode: visit.primaryDisruptionCode,
    updatedAt: visit.updatedAt,
    providerFullName: visit.provider?.fullName ?? null,
    medplumPatientId: visit.patient.medplumPatientId,
    patientFullName: visit.patient.fullName,
    patientArabicName: visit.patient.arabicName,
  }));

  return (
    <div className="card bg-white">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h1 className="h5 mb-0">Dispute and Disruption Queue</h1>
        <span className="badge text-bg-light border">{disputedVisits.length} items</span>
      </div>
      <div className="card-body">
        <p className="text-muted mb-3">
          Review disrupted visits, validate evidence, and assign final resolution actions.
        </p>

        {disputedVisits.length === 0 ? (
          <div className="alert alert-success mb-0">No disputed or disrupted visits in queue.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Visit</th>
                  <th>Patient</th>
                  <th>Clinician</th>
                  <th>State</th>
                  <th>Disruption</th>
                  <th>Scheduled</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {disputedVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.code}</td>
                    <td>
                      <div>{visit.patientFullName}</div>
                      {visit.patientArabicName ? <div className="small text-muted">{visit.patientArabicName}</div> : null}
                    </td>
                    <td>{visit.providerFullName ?? 'Unassigned'}</td>
                    <td>{visit.state ?? visit.status}</td>
                    <td>{visit.primaryDisruptionCode ?? 'n/a'}</td>
                    <td>
                      {new Date(visit.scheduledDate).toLocaleDateString('en-GB')}
                      {visit.scheduledTime ? ` ${visit.scheduledTime}` : ''}
                    </td>
                    <td>{new Date(visit.updatedAt).toLocaleString('en-GB')}</td>
                    <td>
                      {visit.medplumPatientId ? (
                        <Link href={`/admin/patients/${visit.medplumPatientId}`} className="btn btn-sm btn-outline-secondary">
                          Open chart
                        </Link>
                      ) : (
                        <span className="text-muted small">No chart link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
