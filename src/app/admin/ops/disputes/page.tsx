import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';

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
  const user = await getStaffUser(['superadmin', 'admin', 'medical_ops', 'operator']);
  if (!user) {
    redirect('/admin/patients');
  }

  const disputedVisits = await prisma.$queryRaw<DisputeQueueRow[]>`
    SELECT
      v.id,
      v.code,
      v.status::text AS status,
      v.state::text AS state,
      v.scheduled_date AS "scheduledDate",
      v.scheduled_time AS "scheduledTime",
      v.primary_disruption_code::text AS "primaryDisruptionCode",
      v.updated_at AS "updatedAt",
      p.full_name AS "patientFullName",
      p.arabic_name AS "patientArabicName",
      p.medplum_patient_id AS "medplumPatientId",
      pr.full_name AS "providerFullName"
    FROM visits v
    INNER JOIN patients p ON p.id = v.patient_id
    LEFT JOIN providers pr ON pr.id = v.provider_id
    WHERE p.deleted_at IS NULL
      AND (v.state::text = 'disputed' OR v.primary_disruption_code IS NOT NULL)
    ORDER BY v.updated_at DESC, v.scheduled_date DESC
    LIMIT 100
  `;

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
