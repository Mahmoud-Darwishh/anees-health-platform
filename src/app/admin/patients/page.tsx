import Link from 'next/link';
import { listMedplumPatients } from '@/lib/medplum/patients';
import { getStaffUser, isCaseScopedClinicalRole } from '@/lib/auth/rbac';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';

export const dynamic = 'force-dynamic';

const ANEES_PATIENT_CODE_SYSTEM = 'https://anees.health/fhir/identifier/patient-code';

function patientName(p: { name?: Array<{ text?: string }> }): string {
  return p.name?.[0]?.text ?? '—';
}

function patientCode(p: { identifier?: Array<{ system?: string; value?: string }> }): string {
  return p.identifier?.find((i) => i.system === ANEES_PATIENT_CODE_SYSTEM)?.value ?? '—';
}

function patientPhone(p: { telecom?: Array<{ system?: string; value?: string }> }): string {
  return p.telecom?.find((t) => t.system === 'phone')?.value ?? '—';
}

type MedplumPatient = Awaited<ReturnType<typeof listMedplumPatients>>[number];

function adminTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function staffRoleLabel(staffRole?: string | null): string {
  if (!staffRole) {
    return 'Team member';
  }

  switch (staffRole) {
    case 'doctor':
      return 'Doctor';
    case 'nurse':
      return 'Nurse';
    case 'physio':
      return 'Physiotherapist';
    case 'operator':
      return 'Operator';
    case 'superadmin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    default:
      return 'Team member';
  }
}

export default async function AdminPatientsPage() {
  const user = await getStaffUser();
  const firstName = (user?.name ?? user?.email ?? 'teammate').split(' ')[0];
  const greetingLine = `${adminTimeGreeting()}, ${firstName}`;
  const roleLine = `${staffRoleLabel(user?.staffRole)} workspace`;

  let patients: MedplumPatient[] = [];
  let error: string | null = null;

  try {
    patients = await listMedplumPatients();

    const isClinicianScoped = isCaseScopedClinicalRole(user?.staffRole ?? null);

    if (isClinicianScoped && user?.staffId) {
      const practitioner = await ensureCachedMedplumPractitionerForStaff({
        staffId: user.staffId,
        name: user.name ?? user.email ?? `Staff ${user.staffId}`,
        email: user.email,
        role: user.staffRole,
      });

      const visiblePatientIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
      const visibleSet = new Set(visiblePatientIds);
      patients = patients.filter((patient) => !!patient.id && visibleSet.has(patient.id));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load patients from Medplum';
  }

  return (
    <div>
      <div className="anees-banner mb-3 d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-1 small opacity-75">{greetingLine}</p>
          <h1 className="h5 mb-0">Patient Directory</h1>
          <p className="small mb-0 mt-1 text-muted">Scoped, real-time patient records to support safe, coordinated clinical operations.</p>
        </div>
        <span className="anees-chip">{roleLine}</span>
      </div>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="h4 mb-0">Patients</h2>
        <span className="text-muted small">From Medplum · scope-aware · {patients.length} records</span>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          Could not reach Medplum: {error}
        </div>
      )}

      {!error && patients.length === 0 && (
        <div className="alert alert-info" role="alert">
          No patients found in Medplum yet.
        </div>
      )}

      {patients.length > 0 && (
        <>
          <div className="d-md-none anees-mobile-patient-list">
            {patients.map((p) => (
              <article key={p.id} className="anees-mobile-patient-card">
                <h3 className="h6 mb-2">{patientName(p)}</h3>
                <div className="anees-mobile-kv">
                  <span className="anees-mobile-kv-label">Patient code</span>
                  <span className="anees-mobile-kv-value">{patientCode(p)}</span>
                </div>
                <div className="anees-mobile-kv">
                  <span className="anees-mobile-kv-label">Phone</span>
                  <span className="anees-mobile-kv-value">{patientPhone(p)}</span>
                </div>
                <div className="anees-mobile-kv">
                  <span className="anees-mobile-kv-label">Gender</span>
                  <span className="anees-mobile-kv-value text-capitalize">{p.gender ?? '—'}</span>
                </div>
                <div className="anees-mobile-kv">
                  <span className="anees-mobile-kv-label">Birth date</span>
                  <span className="anees-mobile-kv-value">{p.birthDate ?? '—'}</span>
                </div>
                <Link href={`/admin/patients/${p.id}`} className="btn btn-sm btn-outline-primary mt-3 w-100">
                  Open workspace
                </Link>
              </article>
            ))}
          </div>

          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle bg-white">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Patient code</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>Birth date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>{patientName(p)}</td>
                    <td>
                      <code>{patientCode(p)}</code>
                    </td>
                    <td>{patientPhone(p)}</td>
                    <td className="text-capitalize">{p.gender ?? '—'}</td>
                    <td>{p.birthDate ?? '—'}</td>
                    <td className="text-end">
                      <Link href={`/admin/patients/${p.id}`} className="btn btn-sm btn-outline-primary">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
