import Link from 'next/link';
import type { DoctorTaskItem, DoctorWorklistData } from './data';

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function priorityBadge(priority: DoctorTaskItem['priority']): string {
  if (priority === 'stat' || priority === 'asap') return 'text-bg-danger';
  if (priority === 'urgent') return 'text-bg-warning';
  return 'text-bg-light border';
}

export function DoctorWorklistView({ data }: { data: DoctorWorklistData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">My Cases</h2>
        <p className="text-muted mb-0">Review and sign — open the chart to document, sign, or co-sign.</p>
      </header>

      <div className="clinician-stats-grid mb-3">
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">My patients</p>
          <p className="clinician-stat-value mb-0">{data.patients.length}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Open tasks</p>
          <p className="clinician-stat-value mb-0">{data.openTaskCount}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Urgent</p>
          <p className="clinician-stat-value mb-0">{data.urgentCount}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Overdue</p>
          <p className="clinician-stat-value mb-0">{data.overdueCount}</p>
        </article>
      </div>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      {/* Tasks needing the doctor's action (co-sign, review, follow-up) */}
      <h3 className="h6 mt-2">Needs my action</h3>
      {data.tasks.length === 0 ? (
        <div className="alert alert-light border">No open tasks assigned to you.</div>
      ) : (
        <div className="clinician-visit-list mb-3">
          {data.tasks.map((task) => (
            <article key={task.id} className="clinician-visit-card">
              <div className="d-flex align-items-start justify-content-between gap-2">
                <h4 className="h6 mb-1">{task.title}</h4>
                <span className={`badge ${priorityBadge(task.priority)} text-capitalize`}>{task.priority ?? 'routine'}</span>
              </div>
              {task.description ? <p className="small text-muted mb-1">{task.description}</p> : null}
              <p className="small text-muted mb-2">
                {task.dueAtIso ? `Due ${dateTimeFmt.format(new Date(task.dueAtIso))}` : 'No due date'}
                {task.isOverdue ? ' · overdue' : ''}
              </p>
              {task.patientMedplumId ? (
                <Link href={`/admin/patients/${task.patientMedplumId}`} className="btn btn-sm btn-primary">
                  Open chart
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}

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
