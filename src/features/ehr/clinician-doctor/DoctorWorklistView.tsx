import Link from 'next/link';
import type { DoctorWorklistData } from './data';
import { DoctorTaskQueue } from './DoctorTaskQueue';

export function DoctorWorklistView({ data }: { data: DoctorWorklistData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">My Cases</h2>
        <p className="text-muted mb-0">Review and sign — co-sign red flags in one tap, or open the chart to document.</p>
      </header>

      <div className="clinician-stats-grid mb-3">
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">My patients</p>
          <p className="clinician-stat-value mb-0">{data.patients.length}</p>
        </article>
      </div>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      {/* Tasks needing the doctor's action — clickable filters + one-tap co-sign */}
      <DoctorTaskQueue
        tasks={data.tasks}
        openCount={data.openTaskCount}
        urgentCount={data.urgentCount}
        overdueCount={data.overdueCount}
      />

      {/* Care-team patients */}
      <h3 className="h6">My patients</h3>
      {data.patients.length === 0 ? (
        <div className="alert alert-light border">No assigned patients yet. Med Ops will add you to a care team.</div>
      ) : (
        <div className="clinician-visit-list">
          {data.patients.map((patient) => (
            <article key={patient.id} className="clinician-visit-card">
              <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                <div>
                  <h4 className="h6 mb-0">{patient.fullName}</h4>
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
