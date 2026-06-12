import { workflowStateLabel } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function ActivityAuditSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    localVisitsError,
    isTab,
    localVisitTransitions,
  } = ctx;

  return (
    <>
          {isTab('activity-audit') && (
          <div id="patient-restricted-access" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Visit transition timeline</h2>
              <span className="text-muted small">State-first workflow telemetry</span>
            </div>
            <div className="card-body">
              {localVisitsError && <div className="alert alert-warning" role="alert">Could not load workflow visits: {localVisitsError}</div>}
              {!localVisitsError && localVisitTransitions.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">No transition events recorded yet.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {localVisitTransitions.map((entry, index) => (
                    <li key={`${entry.visitCode}-${entry.toState}-${entry.createdAt}-${index}`} className="list-group-item px-0">
                      <div className="fw-semibold">{entry.visitCode} · {workflowStateLabel(entry.toState)}</div>
                      <div className="small text-muted">
                        {new Date(entry.createdAt).toLocaleString('en-GB')}
                        {entry.isOverride ? ` · override (${entry.overrideMethod ?? 'manual'})` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          )}
    </>
  );
}
