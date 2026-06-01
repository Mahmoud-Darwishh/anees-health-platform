import Link from 'next/link';
import { updateEscalationStatusAction } from './actions';
import type { AdminEscalationsData, AdminEscalationsFlash, EscalationQueueItem } from './types';

function statusLabel(status: string): string {
  switch (status) {
    case 'requested':
      return 'Requested';
    case 'accepted':
      return 'Accepted';
    case 'in-progress':
      return 'In progress';
    case 'on-hold':
      return 'On hold';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function priorityLabel(priority?: string | null): string {
  switch (priority) {
    case 'stat':
      return 'STAT';
    case 'asap':
      return 'ASAP';
    case 'urgent':
      return 'Urgent';
    case 'routine':
      return 'Routine';
    default:
      return '—';
  }
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nextStatuses(status: string): Array<'accepted' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled'> {
  switch (status) {
    case 'requested':
      return ['accepted', 'in-progress', 'cancelled'];
    case 'accepted':
      return ['in-progress', 'on-hold', 'cancelled'];
    case 'in-progress':
      return ['completed', 'on-hold', 'cancelled'];
    case 'on-hold':
      return ['in-progress', 'cancelled'];
    default:
      return [];
  }
}

function renderTransitionButtons(item: EscalationQueueItem) {
  const statuses = nextStatuses(item.status);

  if (statuses.length === 0) {
    return <span className="text-muted small">No transitions</span>;
  }

  return (
    <div className="d-flex flex-wrap gap-1 justify-content-end">
      {statuses.map((status) => (
        <form key={status} action={updateEscalationStatusAction}>
          <input type="hidden" name="taskId" value={item.id} />
          <input type="hidden" name="taskVersionId" value={item.versionId ?? ''} />
          <input type="hidden" name="nextStatus" value={status} />
          <input type="hidden" name="medplumPatientId" value={item.patientId ?? ''} />
          <button type="submit" className="btn btn-sm btn-outline-primary" disabled={!item.versionId}>
            {statusLabel(status)}
          </button>
        </form>
      ))}
    </div>
  );
}

export function AdminEscalationsPageView({
  data,
  flash,
}: {
  data: AdminEscalationsData;
  flash: AdminEscalationsFlash | null;
}) {
  const openCount = data.items.filter((item) => !['completed', 'cancelled'].includes(item.status)).length;

  return (
    <div>
      <div className="anees-banner mb-3 d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-1 small opacity-75">Coordination queue</p>
          <h1 className="h5 mb-0">Escalations</h1>
          <p className="small mb-0 mt-1 text-muted">
            Real-time escalation triage with role-safe transitions and audit visibility.
          </p>
        </div>
        <span className="anees-chip">{data.staffRole ?? 'staff'} · {data.staffName}</span>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <span className="anees-chip">Total: {data.items.length}</span>
        <span className="anees-chip">Open: {openCount}</span>
        <span className="anees-chip">Assigned to me: {data.myItems.length}</span>
        <span className="anees-chip">Unassigned: {data.unassignedItems.length}</span>
      </div>

      {flash && (
        <div className={`alert ${flash.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {flash.message}
        </div>
      )}

      {data.error && (
        <div className="alert alert-danger" role="alert">
          {data.error}
        </div>
      )}

      {!data.error && data.items.length === 0 && (
        <div className="alert alert-info" role="alert">
          No escalation tasks found.
        </div>
      )}

      {data.items.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle bg-white">
            <thead className="table-light">
              <tr>
                <th>Patient</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Updated</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="fw-semibold">{item.patientName}</div>
                    <div className="small text-muted">
                      {item.patientCode ? `Code: ${item.patientCode}` : 'Code unavailable'}
                    </div>
                    <div className="small text-muted">{item.title}</div>
                    {item.description && <div className="small text-muted">{item.description}</div>}
                    {item.patientId && (
                      <Link href={`/admin/patients/${item.patientId}?tab=coordination`} className="small">
                        Open patient case
                      </Link>
                    )}
                  </td>
                  <td>{statusLabel(item.status)}</td>
                  <td>{priorityLabel(item.priority)}</td>
                  <td>{item.ownerDisplay ?? 'Unassigned'}</td>
                  <td>
                    {formatDate(item.dueAt)}
                    {item.isOverdue && <div className="small text-danger">Overdue</div>}
                  </td>
                  <td>{formatDate(item.lastUpdated ?? item.authoredOn)}</td>
                  <td className="text-end">{renderTransitionButtons(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
