import Link from 'next/link';
import type { PhysioPatientsData, PhysioPatientsFilter } from './data';
import {
  createDischargeSummaryAction,
  createPatientGoalAction,
  markPatientGoalMetAction,
  updatePatientGoalProgressAction,
} from './actions';

const FILTERS: Array<{ id: PhysioPatientsFilter; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'recently_discharged', label: 'Recently discharged' },
  { id: 'all', label: 'All' },
];

function statusLabel(status: PhysioPatientsData['items'][number]['statusTag']): string {
  if (status === 'active') return 'Active';
  if (status === 'upcoming') return 'Upcoming';
  return 'Recently discharged';
}

function filterHref(filter: PhysioPatientsFilter, query: string): string {
  const params = new URLSearchParams();
  params.set('filter', filter);
  if (query.trim()) {
    params.set('q', query.trim());
  }
  return `/clinician/patients?${params.toString()}`;
}

function goalStatusLabel(value: 'in_progress' | 'met' | 'discontinued'): string {
  if (value === 'in_progress') return 'In progress';
  if (value === 'met') return 'Met';
  return 'Discontinued';
}

export function PatientsPageView({ data }: { data: PhysioPatientsData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">My Patients</h2>
        <p className="text-muted mb-0">Case-scoped patients assigned to your physiotherapy workflow.</p>
      </header>

      <form method="get" className="clinician-search-form mb-3">
        <input type="hidden" name="filter" value={data.filter} />
        <label htmlFor="clinicianPatientSearch" className="form-label small text-muted mb-1">
          Search by name, Arabic name, code, or phone
        </label>
        <div className="d-flex gap-2">
          <input
            id="clinicianPatientSearch"
            name="q"
            defaultValue={data.query}
            className="form-control"
            placeholder="e.g. Salma, P-1023"
          />
          <button type="submit" className="btn btn-outline-secondary">
            Search
          </button>
        </div>
      </form>

      <div className="clinician-filter-chips mb-3" role="tablist" aria-label="Patient list filters">
        {FILTERS.map((filter) => {
          const active = data.filter === filter.id;
          return (
            <Link
              key={filter.id}
              href={filterHref(filter.id, data.query)}
              className={active ? 'clinician-filter-chip is-active' : 'clinician-filter-chip'}
              aria-current={active ? 'page' : undefined}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      {data.items.length === 0 ? (
        <div className="alert alert-light border mb-0">No patients matched your current filters.</div>
      ) : (
        <div className="clinician-patient-list">
          {data.items.map((item) => (
            <article key={item.id} className="clinician-patient-card">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <h3 className="h6 mb-0">{item.fullName}</h3>
                  {item.arabicName ? <p className="text-muted small mb-0">{item.arabicName}</p> : null}
                </div>
                <span className="badge text-bg-light border">{statusLabel(item.statusTag)}</span>
              </div>

              <p className="small text-muted mb-2">
                {item.activePlanName ?? 'No active care plan'}
                {' · '}
                {item.progressLabel}
              </p>

              <p className="small text-muted mb-3">
                Next visit: {item.nextVisitLabel ?? 'Not scheduled'}
                {' · '}
                Patient code: {item.code}
              </p>

              <section className="clinician-patient-panel-card mb-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <h4 className="h6 mb-0">Goals</h4>
                  <span className="badge text-bg-light border">
                    {item.goalSummary.met}/{item.goalSummary.total} met
                  </span>
                </div>

                <p className="small text-muted mb-2">
                  In progress: {item.goalSummary.inProgress}
                  {' · '}
                  Total tracked: {item.goalSummary.total}
                </p>

                {item.activeGoals.length === 0 ? (
                  <p className="small text-muted mb-2">No goals yet for this patient.</p>
                ) : (
                  <div className="clinician-goal-list mb-2">
                    {item.activeGoals.map((goal) => (
                      <article key={goal.id} className="clinician-goal-item">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <strong className="small">{goal.text}</strong>
                          <span className="badge text-bg-light border">{goalStatusLabel(goal.status)}</span>
                        </div>
                        <p className="small text-muted mb-2">
                          Current: {goal.currentValue ?? 'Not set'}
                          {' · '}
                          Target: {goal.targetValue ?? 'Not set'}
                          {goal.measurementUnit ? ` ${goal.measurementUnit}` : ''}
                        </p>

                        {goal.status === 'in_progress' ? (
                          <div className="d-flex flex-wrap gap-2">
                            <form action={updatePatientGoalProgressAction} className="d-flex gap-2 flex-grow-1">
                              <input type="hidden" name="patientId" value={item.id} />
                              <input type="hidden" name="goalId" value={goal.id} />
                              <input
                                name="currentValue"
                                className="form-control form-control-sm"
                                placeholder="Update current value"
                                defaultValue={goal.currentValue ?? ''}
                              />
                              <button type="submit" className="btn btn-sm btn-outline-secondary">
                                Update
                              </button>
                            </form>

                            <form action={markPatientGoalMetAction}>
                              <input type="hidden" name="patientId" value={item.id} />
                              <input type="hidden" name="goalId" value={goal.id} />
                              <button type="submit" className="btn btn-sm btn-success">
                                Mark met
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}

                <form action={createPatientGoalAction} className="row g-2">
                  <input type="hidden" name="patientId" value={item.id} />
                  <div className="col-12">
                    <label className="form-label small mb-1">New goal</label>
                    <input name="text" className="form-control form-control-sm" placeholder="e.g. Walk 10m unaided" dir="auto" required />
                  </div>
                  <div className="col-6">
                    <label className="form-label small mb-1">Current</label>
                    <input name="baselineValue" className="form-control form-control-sm" placeholder="e.g. 3m" dir="auto" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small mb-1">Target</label>
                    <input name="targetValue" className="form-control form-control-sm" placeholder="e.g. 10m" dir="auto" />
                  </div>
                  <div className="col-4">
                    <label className="form-label small mb-1">Category</label>
                    <input name="category" className="form-control form-control-sm" placeholder="mobility" />
                  </div>
                  <div className="col-4">
                    <label className="form-label small mb-1">Unit</label>
                    <input name="measurementUnit" className="form-control form-control-sm" placeholder="meters" />
                  </div>
                  <div className="col-4">
                    <label className="form-label small mb-1">Target date</label>
                    <input name="targetDate" type="date" className="form-control form-control-sm" />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-sm btn-outline-secondary">
                      Add goal
                    </button>
                  </div>
                </form>
              </section>

              <section className="clinician-patient-panel-card mb-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <h4 className="h6 mb-0">Discharge Summary</h4>
                  <span className="badge text-bg-light border">Sprint 8</span>
                </div>

                <form action={createDischargeSummaryAction} className="row g-2">
                  <input type="hidden" name="patientId" value={item.id} />
                  <div className="col-12">
                    <label className="form-label small mb-1">Recommendations</label>
                    <textarea
                      name="recommendations"
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="Clinical discharge recommendations"
                      dir="auto"
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small mb-1">Follow-up plan (optional)</label>
                    <input name="followUpPlan" className="form-control form-control-sm" placeholder="e.g. Review in 4 weeks" dir="auto" />
                  </div>
                  <div className="col-12 d-flex align-items-center gap-2">
                    <input id={`include-auto-${item.id}`} name="includeAutoSummary" type="checkbox" value="yes" defaultChecked />
                    <label htmlFor={`include-auto-${item.id}`} className="small mb-0">
                      Include auto summary (goals status)
                    </label>
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-sm btn-primary">
                      Generate and sign discharge summary
                    </button>
                  </div>
                </form>
              </section>

              <Link href={`/admin/patients/${item.medplumPatientId}`} className="btn btn-sm btn-outline-secondary">
                Open chart
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
