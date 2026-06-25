import Link from 'next/link';
import type { DoctorPatientsData } from './patients-data';

export function DoctorPatientsView({ data }: { data: DoctorPatientsData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">My patients</h2>
        <p className="text-muted mb-0">Your assigned caseload. Open a chart to review history, then document from today&apos;s visit.</p>
      </header>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      {data.patients.length === 0 ? (
        <div className="alert alert-light border mb-0">No assigned patients yet. Med Ops will add you to a care team.</div>
      ) : (
        <div className="clinician-patient-list">
          {data.patients.map((patient) => (
            <article key={patient.id} className="clinician-patient-card">
              <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                <div>
                  <h3 className="h6 mb-0">{patient.fullName}</h3>
                  {patient.arabicName ? <p className="text-muted small mb-0">{patient.arabicName}</p> : null}
                </div>
                {patient.dnr ? <span className="badge text-bg-warning">DNR</span> : null}
              </div>
              <p className="small text-muted mb-2">
                {patient.code}
                {patient.activePlanName ? ` · ${patient.activePlanName}` : ''}
              </p>
              <Link href={`/admin/patients/${patient.medplumPatientId}`} className="btn btn-sm btn-outline-secondary">
                Open chart
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
