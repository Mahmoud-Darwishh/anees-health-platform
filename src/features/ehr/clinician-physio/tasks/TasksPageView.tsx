import type { MedplumTaskResource } from '@/lib/medplum/tasks';
import { completeTaskAction, startTaskAction } from './actions';
import type { ClinicianTasksData } from './data';

function formatDateTime(value: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status: MedplumTaskResource['status']): string {
  if (status === 'in-progress') return 'In progress';
  if (status === 'on-hold') return 'On hold';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'requested') return 'Requested';
  if (status === 'accepted') return 'Accepted';
  return status;
}

function priorityLabel(priority: MedplumTaskResource['priority'] | null): string {
  if (!priority) return 'Routine';
  if (priority === 'asap') return 'ASAP';
  if (priority === 'stat') return 'STAT';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function canStart(status: MedplumTaskResource['status']): boolean {
  return status === 'requested' || status === 'accepted' || status === 'ready' || status === 'received';
}

function canComplete(status: MedplumTaskResource['status']): boolean {
  return status !== 'completed' && status !== 'cancelled' && status !== 'failed' && status !== 'entered-in-error';
}

export function TasksPageView({ data }: { data: ClinicianTasksData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">Tasks</h2>
        <p className="text-muted mb-0">Owner-assigned tasks from the care workflow and escalation pipeline.</p>
      </header>

      <section className="clinician-stats-grid mb-3">
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Open tasks</p>
          <p className="clinician-stat-value mb-0">{data.openCount}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Overdue</p>
          <p className="clinician-stat-value mb-0">{data.overdueCount}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Urgent / ASAP</p>
          <p className="clinician-stat-value mb-0">{data.urgentCount}</p>
        </article>
      </section>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      {data.items.length === 0 ? (
        <div className="alert alert-light border mb-0">No tasks assigned right now.</div>
      ) : (
        <div className="clinician-patient-list">
          {data.items.map((item) => (
            <article key={item.id} className="clinician-patient-card">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <h3 className="h6 mb-0">{item.title}</h3>
                  <p className="small text-muted mb-0">{statusLabel(item.status)} · {priorityLabel(item.priority)}</p>
                </div>
                {item.patientReference ? <span className="badge text-bg-light border">{item.patientReference}</span> : null}
              </div>

              {item.description ? <p className="small mb-2">{item.description}</p> : null}

              <p className="small text-muted mb-3">
                Due: {formatDateTime(item.dueAtIso)} · Updated: {formatDateTime(item.lastUpdatedIso)}
              </p>

              <div className="d-flex flex-wrap gap-2">
                {canStart(item.status) ? (
                  <form action={startTaskAction}>
                    <input type="hidden" name="taskId" value={item.id} />
                    <button type="submit" className="btn btn-sm btn-outline-secondary">
                      Start
                    </button>
                  </form>
                ) : null}
                {canComplete(item.status) ? (
                  <form action={completeTaskAction}>
                    <input type="hidden" name="taskId" value={item.id} />
                    <button type="submit" className="btn btn-sm btn-primary">
                      Mark complete
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}