import { createStandingOrderAction, executeStandingOrderAction, closeCareEpisodeAction } from '../actions';
import { workflowStateLabel, formatClinicalDate, carePlanStatusBadgeClass, goalStatusBadgeClass, goalStatusLabel } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function CarePlanGoalsSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    carePlans,
    carePlansError,
    goals,
    goalsError,
    localVisits,
    standingOrders,
    standingOrdersError,
    episodes,
    episodesError,
    episodeCloseWrite,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('care-plan-goals') && (
          <>
          <div className="card bg-white mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Care episode &amp; discharge</h2>
              <span className="text-muted small">{episodes.length} episode{episodes.length === 1 ? '' : 's'}</span>
            </div>
            <div className="card-body">
              {episodesError && <div className="alert alert-warning" role="alert">Could not load care episodes: {episodesError}</div>}
              {!episodesError && episodes.length === 0 && <div className="alert alert-info" role="alert">No care episode recorded yet.</div>}
              {!episodesError && episodes.length > 0 && (
                <div className="table-responsive mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Status</th><th>Start</th><th>End</th><th>Outcome</th></tr></thead>
                    <tbody>
                      {episodes.map((episode) => (
                        <tr key={episode.id}>
                          <td><span className={`badge ${episode.status === 'finished' ? 'bg-secondary' : 'bg-success'}`}>{episode.status}</span></td>
                          <td>{episode.start ? new Date(episode.start).toLocaleDateString('en-GB') : '—'}</td>
                          <td>{episode.end ? new Date(episode.end).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="text-muted small">{episode.outcomeSummary ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {episodeCloseWrite ? (
                <form action={closeCareEpisodeAction} className="row g-2">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <div className="col-12">
                    <label htmlFor="episodeOutcomeSummary" className="form-label">Discharge outcome summary</label>
                    <textarea id="episodeOutcomeSummary" name="episodeOutcomeSummary" className="form-control" rows={2} placeholder="Goals achieved, condition at discharge, follow-up plan…" required dir="auto" />
                  </div>
                  <div className="col-12"><button type="submit" className="btn btn-outline-danger">Discharge / close care episode</button></div>
                </form>
              ) : (
                <p className="small text-muted mb-0">Discharge (closing the care episode) is a licensed-physician sign-off, per the role matrix.</p>
              )}
            </div>
          </div>
          <div id="patient-care-plan-goals" className="row g-3">
            <div className="col-lg-6">
              <div className="card bg-white h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="h6 mb-0">Care plans</h2>
                  <span className="text-muted small">{carePlans.length} records</span>
                </div>
                <div className="card-body">
                  {carePlansError && <div className="alert alert-warning mb-0" role="alert">Could not load care plans: {carePlansError}</div>}
                  {!carePlansError && carePlans.length === 0 && <div className="alert alert-info mb-0" role="alert">No formal care plans are active in Medplum yet.</div>}
                  {!carePlansError && carePlans.length > 0 && (
                    <div className="list-group list-group-flush">
                      {carePlans.map((carePlan) => (
                        <div key={carePlan.id} className="list-group-item px-0">
                          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{carePlan.title}</div>
                              <div className="small text-muted">
                                {carePlan.program ?? 'Clinical program'} &middot; {formatClinicalDate(carePlan.start)} to {formatClinicalDate(carePlan.end)}
                              </div>
                            </div>
                            <span className={`badge ${carePlanStatusBadgeClass(carePlan.status)}`}>{workflowStateLabel(carePlan.status)}</span>
                          </div>
                          {carePlan.description && <p className="small text-muted mb-0 mt-2">{carePlan.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card bg-white h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="h6 mb-0">Patient goals</h2>
                  <span className="text-muted small">{goals.length} records</span>
                </div>
                <div className="card-body">
                  {goalsError && <div className="alert alert-warning mb-0" role="alert">Could not load patient goals: {goalsError}</div>}
                  {!goalsError && goals.length === 0 && <div className="alert alert-info mb-0" role="alert">No structured goals are recorded yet.</div>}
                  {!goalsError && goals.length > 0 && (
                    <div className="list-group list-group-flush">
                      {goals.map((goal) => (
                        <div key={goal.id} className="list-group-item px-0">
                          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{goal.text}</div>
                              <div className="small text-muted">{goal.category ?? 'Goal'} &middot; target {formatClinicalDate(goal.targetDate)}</div>
                            </div>
                            <span className={`badge ${goalStatusBadgeClass(goal.status)}`}>{goalStatusLabel(goal.status)}</span>
                          </div>
                          <div className="small text-muted mt-2">
                            Current: {goal.currentValue ?? '—'} &middot; Target: {goal.targetValue ?? '—'}
                            {goal.measurementUnit ? ` ${goal.measurementUnit}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Standing orders</h2>
              <span className="text-muted small">{standingOrders.length} records</span>
            </div>
            <div className="card-body d-grid gap-3">
              <form action={createStandingOrderAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="standingOrderDiscipline" className="form-label">Discipline</label>
                  <select id="standingOrderDiscipline" name="standingOrderDiscipline" className="form-select" defaultValue="medical">
                    <option value="medical">Medical</option>
                    <option value="nursing">Nursing</option>
                    <option value="physiotherapy">Physiotherapy</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <label htmlFor="standingOrderTitle" className="form-label">Title</label>
                  <input id="standingOrderTitle" name="standingOrderTitle" className="form-control" placeholder="Fever panel standing order" required />
                </div>
                <div className="col-md-4">
                  <label htmlFor="standingOrderValidUntil" className="form-label">Valid until</label>
                  <input id="standingOrderValidUntil" name="standingOrderValidUntil" type="datetime-local" className="form-control" />
                </div>
                <div className="col-12">
                  <label htmlFor="standingOrderInstructions" className="form-label">Instructions</label>
                  <textarea id="standingOrderInstructions" name="standingOrderInstructions" rows={2} className="form-control" required dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-outline-primary">Create standing order</button>
                </div>
              </form>

              {standingOrdersError && <div className="alert alert-warning" role="alert">Could not load standing orders: {standingOrdersError}</div>}
              {!standingOrdersError && standingOrders.length === 0 && <div className="alert alert-info mb-0" role="alert">No standing orders configured yet.</div>}
              {!standingOrdersError && standingOrders.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr><th>Order</th><th>Status</th><th>Last execution</th><th>Execute</th></tr>
                    </thead>
                    <tbody>
                      {standingOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <div className="fw-semibold">{order.title}</div>
                            <div className="small text-muted text-capitalize">{order.discipline} · {order.instructions}</div>
                          </td>
                          <td>
                            <span className={`badge ${order.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>{order.isActive ? 'Active' : 'Inactive'}</span>
                            <div className="small text-muted">Exec count: {order.executionCount}</div>
                          </td>
                          <td>{order.lastExecutionAt ? new Date(order.lastExecutionAt).toLocaleString('en-GB') : 'Never'}</td>
                          <td>
                            <form action={executeStandingOrderAction} className="row g-1">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="standingOrderId" value={order.id} />
                              <div className="col-12">
                                <select name="executionVisitId" className="form-select form-select-sm" defaultValue="" required>
                                  <option value="" disabled>Select active visit</option>
                                  {localVisits.filter((visit) => Boolean(visit.checkInAt) && !visit.checkOutAt).map((visit) => (
                                    <option key={visit.id} value={visit.id}>{visit.code}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-12"><input name="executionRecordedAt" type="datetime-local" className="form-control form-control-sm" required /></div>
                              <div className="col-12"><input name="executionNote" className="form-control form-control-sm" placeholder="Execution note" /></div>
                              <div className="col-12"><button type="submit" className="btn btn-sm btn-outline-success w-100">Execute</button></div>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          </>
          )}
    </>
  );
}
