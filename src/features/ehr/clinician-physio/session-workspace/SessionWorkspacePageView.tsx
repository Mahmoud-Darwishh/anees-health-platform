import Link from 'next/link';
import {
  createPhysioSessionReportAction,
  createPhysioAssessmentAction,
  checkOutVisitAction,
  markRefusedAtDoorAction,
  markPatientNotHomeAction,
  declineVisitAction,
  disputeVisitAction,
} from '../actions';
import { VisitTransitionForm } from '../VisitTransitionForm';
import { listInstruments } from '@/features/ehr/catalogs/assessment-instruments';
import type { PhysioSessionWorkspaceData } from './data';
import { TemplateObjectiveFields } from './TemplateObjectiveFields';

function workflowStateLabel(state: string): string {
  return state
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function painBarHeight(value: number | null): number {
  if (value === null) return 8;
  const normalized = Math.max(0, Math.min(10, value));
  return 12 + normalized * 8;
}

function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = stepX * index;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function sparklinePointCoords(values: number[], width: number, height: number): Array<{ x: number; y: number }> {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values.map((value, index) => ({
    x: Number((stepX * index).toFixed(2)),
    y: Number((height - ((value - min) / span) * height).toFixed(2)),
  }));
}

export function SessionWorkspacePageView({ data }: { data: PhysioSessionWorkspaceData }) {
  const { visit } = data;
  const eventAtIso = new Date().toISOString();
  const dashboard = data.sessionDashboard;
  const sparklineValues = dashboard.weeklyPainSparkline.map((point) => point.avgDrop ?? 0);
  const sparklineSvgPath = sparklinePath(sparklineValues, 220, 52);
  const sparklineCoords = sparklinePointCoords(sparklineValues, 220, 52);
  const templateBestAvgDrop = dashboard.templateOutcomeRanking[0]?.avgDrop ?? 0;

  return (
    <section className="clinician-surface">
      <header className="mb-3 d-flex justify-content-between align-items-start gap-2 flex-wrap">
        <div>
          <p className="text-muted mb-1">Visit #{visit.code}</p>
          <h2 className="h5 mb-1">Physio Session Workspace</h2>
          <p className="text-muted mb-0">
            {visit.patient.fullName}
            {visit.patient.arabicName ? ` · ${visit.patient.arabicName}` : ''}
          </p>
        </div>
        <Link href="/clinician/today" className="btn btn-sm btn-outline-secondary">
          Back to My Journey
        </Link>
      </header>

      <div className="mb-3 small text-muted">
        <div>
          Workflow: <strong>{workflowStateLabel(visit.effectiveState)}</strong>
        </div>
        <div>
          {visit.serviceName}
          {visit.areaName ? ` · ${visit.areaName}` : ''}
          {visit.scheduledTime ? ` · ${visit.scheduledTime}` : ''}
        </div>
        <div>
          {visit.patient.addressDetail ?? 'Address unavailable'}
          {visit.patient.landmark ? ` · ${visit.patient.landmark}` : ''}
        </div>
      </div>

      {!data.canDocumentSession ? (
        <div className="alert alert-warning py-2">
          Session documentation is enabled only after check-in. Current state: {workflowStateLabel(visit.effectiveState)}.
        </div>
      ) : null}

      <section className="clinician-dashboard-grid mb-3">
        <article className="clinician-kpi-card">
          <p className="clinician-kpi-label mb-1">Total PT sessions</p>
          <p className="clinician-kpi-value mb-0">{dashboard.totalSessions}</p>
        </article>
        <article className="clinician-kpi-card">
          <p className="clinician-kpi-label mb-1">Avg pain drop</p>
          <p className="clinician-kpi-value mb-0">{dashboard.avgPainDrop !== null ? `${dashboard.avgPainDrop}` : 'n/a'}</p>
        </article>
        <article className="clinician-kpi-card">
          <p className="clinician-kpi-label mb-1">Ready or near discharge</p>
          <p className="clinician-kpi-value mb-0">{dashboard.readyOrNearDischarge}</p>
        </article>
        <article className="clinician-kpi-card">
          <p className="clinician-kpi-label mb-1">Top template</p>
          <p className="clinician-kpi-value mb-0 clinician-kpi-value--small">{dashboard.topTemplate}</p>
        </article>
      </section>

      <section className="row g-3 mb-3">
        <div className="col-12 col-lg-7">
          <article className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h3 className="h6 mb-3">Template Mix Dashboard</h3>
              {dashboard.templateDistribution.length === 0 ? (
                <p className="small text-muted mb-0">No template usage data yet.</p>
              ) : (
                <div className="clinician-chart-list">
                  {dashboard.templateDistribution.map((item) => (
                    <div key={item.key} className="clinician-chart-row">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{item.label}</span>
                        <span>{item.count} sessions · {item.percentage}%</span>
                      </div>
                      <div className="clinician-progress-track" role="img" aria-label={`${item.label} ${item.percentage}%`}>
                        <div className="clinician-progress-fill" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="col-12 col-lg-5">
          <article className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h3 className="h6 mb-3">Pain Trend Chart</h3>
              {dashboard.painTrend.length === 0 ? (
                <p className="small text-muted mb-0">No pain trend points yet.</p>
              ) : (
                <div className="clinician-pain-chart" role="img" aria-label="Pain before and after trend">
                  {dashboard.painTrend.map((point, index) => (
                    <div key={`${point.dateLabel}-${index}`} className="clinician-pain-chart-col">
                      <div className="clinician-pain-bars">
                        <span
                          className="clinician-pain-bar is-before"
                          style={{ height: `${painBarHeight(point.painBefore)}px` }}
                          title={`Before: ${point.painBefore ?? 'n/a'}`}
                        />
                        <span
                          className="clinician-pain-bar is-after"
                          style={{ height: `${painBarHeight(point.painAfter)}px` }}
                          title={`After: ${point.painAfter ?? 'n/a'}`}
                        />
                      </div>
                      <span className="clinician-pain-date">{point.dateLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="row g-3 mb-3">
        <div className="col-12 col-lg-6">
          <article className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="h6 mb-0">Weekly Pain-Drop Sparkline</h3>
                <span className="small text-muted">Last 7 days</span>
              </div>

              {dashboard.weeklyPainSparkline.length === 0 ? (
                <p className="small text-muted mb-0">No weekly trend data yet.</p>
              ) : (
                <>
                  <svg viewBox="0 0 220 52" className="clinician-sparkline" role="img" aria-label="Weekly pain-drop sparkline">
                    <path d={sparklineSvgPath} className="clinician-sparkline-line" />
                    {sparklineCoords.map((point, index) => {
                      const dataPoint = dashboard.weeklyPainSparkline[index];
                      const valueLabel = dataPoint?.avgDrop !== null && dataPoint?.avgDrop !== undefined ? dataPoint.avgDrop : 'no data';
                      return (
                        <circle key={`${dataPoint?.label ?? 'pt'}-${index}`} cx={point.x} cy={point.y} r={2.75} className="clinician-sparkline-dot">
                          <title>{`${dataPoint?.label ?? 'Day'}: ${valueLabel}`}</title>
                        </circle>
                      );
                    })}
                  </svg>

                  <div className="clinician-sparkline-labels mt-2">
                    {dashboard.weeklyPainSparkline.map((point, index) => (
                      <div key={`${point.label}-${index}`} className="clinician-sparkline-label-item">
                        <span className="clinician-sparkline-day">{point.label}</span>
                        <span className="clinician-sparkline-value">{point.avgDrop !== null ? point.avgDrop : '-'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </article>
        </div>

        <div className="col-12 col-lg-6">
          <article className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
                <h3 className="h6 mb-0">Template Performance by Outcomes</h3>
                <div className="clinician-window-switch" role="group" aria-label="Template outcome ranking window">
                  <Link
                    href={`/clinician/visits/${visit.id}/session?window=7d`}
                    className={
                      dashboard.templateOutcomeRankingWindow === '7d'
                        ? 'clinician-window-switch-btn is-active'
                        : 'clinician-window-switch-btn'
                    }
                  >
                    7d
                  </Link>
                  <Link
                    href={`/clinician/visits/${visit.id}/session?window=30d`}
                    className={
                      dashboard.templateOutcomeRankingWindow === '30d'
                        ? 'clinician-window-switch-btn is-active'
                        : 'clinician-window-switch-btn'
                    }
                  >
                    30d
                  </Link>
                  <Link
                    href={`/clinician/visits/${visit.id}/session?window=all`}
                    className={
                      dashboard.templateOutcomeRankingWindow === 'all'
                        ? 'clinician-window-switch-btn is-active'
                        : 'clinician-window-switch-btn'
                    }
                  >
                    All
                  </Link>
                </div>
              </div>
              {dashboard.templateOutcomeRanking.length === 0 ? (
                <p className="small text-muted mb-0">No outcome ranking yet.</p>
              ) : (
                <div className="clinician-chart-list">
                  {dashboard.templateOutcomeRanking.map((item) => {
                    const widthPct = templateBestAvgDrop > 0 ? Math.round((item.avgDrop / templateBestAvgDrop) * 100) : 0;
                    return (
                      <div key={item.key} className="clinician-chart-row">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{item.label}</span>
                          <span>avg drop {item.avgDrop} · {item.sessions} sessions</span>
                        </div>
                        <div className="clinician-progress-track" role="img" aria-label={`${item.label} outcome rank ${widthPct}%`}>
                          <div className="clinician-progress-fill is-outcome" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        </div>
      </section>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <article className="card border-0 shadow-sm">
            <div className="card-body">
              <h3 className="h6 mb-3">Structured Physio Session Note</h3>

              <form action={createPhysioSessionReportAction} className="row g-3">
                <input type="hidden" name="visitId" value={visit.id} />

                <div className="col-md-6">
                  <label className="form-label">Session Number</label>
                  <input name="sessionNumberLabel" className="form-control" placeholder="e.g. Session 4" dir="auto" />
                </div>

                <div className="col-12">
                  <label className="form-label">Subjective Function</label>
                  <textarea name="subjectiveFunction" className="form-control" rows={2} dir="auto" />
                </div>

                <TemplateObjectiveFields />

                <div className="col-md-6">
                  <label className="form-label">Pain Before (0-10)</label>
                  <input name="painBefore" type="number" className="form-control" min={0} max={10} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Pain After (0-10)</label>
                  <input name="painAfter" type="number" className="form-control" min={0} max={10} />
                </div>

                <div className="col-12">
                  <label className="form-label">Interventions</label>
                  <textarea name="interventions" className="form-control" rows={2} dir="auto" />
                </div>

                <div className="col-12">
                  <label className="form-label">Response Summary</label>
                  <textarea name="responseSummary" className="form-control" rows={2} dir="auto" />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Discharge Readiness</label>
                  <select name="dischargeReadiness" className="form-select" defaultValue="not_yet">
                    <option value="not_yet">Not yet</option>
                    <option value="one_to_two_sessions">1-2 sessions</option>
                    <option value="ready">Ready</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Next Session Focus</label>
                  <input name="nextSessionFocus" className="form-control" dir="auto" />
                </div>

                <div className="col-12">
                  <label className="form-label">Home Plan</label>
                  <textarea name="homePlan" className="form-control" rows={2} dir="auto" />
                </div>

                <div className="col-12">
                  <label className="form-label">Clinical Note</label>
                  <textarea name="noteBody" className="form-control" rows={4} required dir="auto" />
                </div>

                <div className="col-12 d-flex justify-content-end">
                  <button type="submit" className="btn btn-primary" disabled={!data.canDocumentSession}>
                    Save Physio Session Note
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>

        <div className="col-12 col-xl-4">
          <article className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Session Completion</h3>
              <p className="small text-muted mb-3">Check out when you complete treatment and handover tasks.</p>
              <VisitTransitionForm
                action={checkOutVisitAction}
                label="Check out"
                transitionType="check_out"
                visitId={visit.id}
              />
            </div>
          </article>

          <article className="card border-0 shadow-sm">
            <div className="card-body">
              <h3 className="h6 mb-2">Patient Chart</h3>
              <p className="small text-muted mb-3">Open full chart for labs, meds, and care-team coordination.</p>
              <Link href={`/admin/patients/${visit.patient.medplumPatientId}`} className="btn btn-outline-secondary btn-sm">
                Open chart
              </Link>
            </div>
          </article>

          <article className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Quick Assessments</h3>
              <p className="small text-muted mb-3">Capture structured outcome measures during the session.</p>

              <form action={createPhysioAssessmentAction} className="mb-3">
                <input type="hidden" name="visitId" value={visit.id} />

                <div className="mb-2">
                  <label className="form-label small mb-1">Validated instrument</label>
                  <select name="assessmentInstrument" className="form-select form-select-sm" defaultValue="berg" required>
                    {listInstruments().map((instrument) => (
                      <option key={instrument.key} value={instrument.key}>
                        {instrument.shortName} — {instrument.reference}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label small mb-1">Score</label>
                  <input name="assessmentScore" type="number" step="any" className="form-control form-control-sm" required />
                </div>

                <div className="mb-2">
                  <label className="form-label small mb-1">Summary</label>
                  <textarea name="assessmentSummary" className="form-control form-control-sm" rows={2} required dir="auto" />
                </div>

                <div className="mb-3">
                  <label className="form-label small mb-1">Notes</label>
                  <textarea name="assessmentNote" className="form-control form-control-sm" rows={2} dir="auto" />
                </div>

                <button type="submit" className="btn btn-sm btn-outline-primary" disabled={!data.canDocumentSession}>
                  Save assessment
                </button>
              </form>

              <div>
                <h4 className="h6 mb-2">Recent Assessment Trend</h4>
                {data.recentAssessments.length === 0 ? (
                  <p className="small text-muted mb-0">No assessments recorded yet.</p>
                ) : (
                  <div className="small">
                    {data.recentAssessments.slice(0, 6).map((assessment) => (
                      <div key={assessment.id} className="mb-2 pb-2 border-bottom">
                        <div className="d-flex justify-content-between align-items-center gap-2">
                          <span className="fw-semibold">{assessment.title}</span>
                          {assessment.band ? <span className="badge bg-secondary-subtle text-secondary-emphasis">{assessment.band}</span> : null}
                        </div>
                        <div className="text-muted">
                          {assessment.type}
                          {assessment.score !== null ? ` · score ${assessment.score}` : ''}
                          {assessment.authored ? ` · ${new Date(assessment.authored).toLocaleDateString('en-GB')}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Coded Outcome Measures</h3>
              <p className="small text-muted mb-3">Discrete FHIR-coded scores (last 90 days) — trendable and interoperable.</p>
              {data.codedOutcomeMeasures.length === 0 ? (
                <p className="small text-muted mb-0">No coded outcome measures yet.</p>
              ) : (
                <div className="small">
                  {data.codedOutcomeMeasures.map((measure) => (
                    <div key={measure.code} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                      <div>
                        <div className="fw-semibold">{measure.display}</div>
                        <div className="text-muted">
                          {measure.points.length} reading{measure.points.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">
                          {measure.latest
                            ? `${measure.latest.value}${measure.unit && measure.unit !== '{score}' ? ` ${measure.unit}` : ''}`
                            : '—'}
                        </div>
                        <div className="text-muted">
                          {measure.latest ? new Date(measure.latest.date).toLocaleDateString('en-GB') : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h3 className="h6 mb-2">Disruption Actions</h3>
              <p className="small text-muted mb-3">Use when session flow is disrupted and needs operational review.</p>

              <form action={markRefusedAtDoorAction} className="mb-2">
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="eventAt" value={eventAtIso} />
                <input type="hidden" name="disruptionCode" value="patient_refused_care" />
                <input
                  name="disruptionNote"
                  className="form-control form-control-sm mb-2"
                  placeholder="Attempt log for refused care"
                  dir="auto"
                  required
                />
                <button type="submit" className="btn btn-sm btn-outline-warning">Mark refused at door</button>
              </form>

              <form action={markPatientNotHomeAction} className="mb-2">
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="eventAt" value={eventAtIso} />
                <input type="hidden" name="disruptionCode" value="patient_no_show" />
                <input
                  name="disruptionNote"
                  className="form-control form-control-sm mb-2"
                  placeholder="Attempt log for patient not home"
                  dir="auto"
                  required
                />
                <button type="submit" className="btn btn-sm btn-outline-warning">Mark patient not home</button>
              </form>

              <form action={declineVisitAction} className="mb-2">
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="eventAt" value={eventAtIso} />
                <input type="hidden" name="disruptionCode" value="physio_personal_emergency" />
                <input
                  name="disruptionNote"
                  className="form-control form-control-sm mb-2"
                  placeholder="Reason for declining visit"
                  dir="auto"
                />
                <button type="submit" className="btn btn-sm btn-outline-secondary">Decline visit</button>
              </form>

              <form action={disputeVisitAction}>
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="eventAt" value={eventAtIso} />
                <input type="hidden" name="disruptionCode" value="other" />
                <textarea
                  name="disruptionNote"
                  className="form-control form-control-sm mb-2"
                  rows={2}
                  placeholder="Dispute details for Med Ops"
                  dir="auto"
                  required
                />
                <button type="submit" className="btn btn-sm btn-outline-danger">Raise dispute</button>
              </form>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
