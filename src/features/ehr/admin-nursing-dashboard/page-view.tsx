import type { NurseDashboardData } from './types';

function currency(value: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-GB');
}

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-GB');
}

function statusLabel(status: string): string {
  return status.replace('_', ' ');
}

function kpiCard(label: string, value: string, hint?: string) {
  return (
    <div className="card bg-white">
      <div className="card-body">
        <div className="text-muted small">{label}</div>
        <div className="h5 mb-1">{value}</div>
        {hint ? <div className="small text-muted">{hint}</div> : null}
      </div>
    </div>
  );
}

export function AdminNursingDashboardView({ data }: { data: NurseDashboardData }) {
  if (data.error) {
    return (
      <div className="alert alert-danger" role="alert">
        {data.error}
      </div>
    );
  }

  return (
    <div className="d-grid gap-3">
      <div className="anees-banner d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-1 small opacity-75">Nurse Performance Dashboard</p>
          <h1 className="h5 mb-0">{data.staffName}</h1>
          <p className="small mb-0 mt-1 text-muted">Period: {data.periodLabel}</p>
        </div>
        <span className="anees-chip text-capitalize">{data.staffRole ?? 'staff'}</span>
      </div>

      <div className="card bg-white">
        <div className="card-header">
          <h2 className="h6 mb-0">Period Filter</h2>
        </div>
        <div className="card-body">
          <form method="get" className="row g-2 align-items-end">
            <div className="col-md-3">
              <label htmlFor="period" className="form-label small text-muted mb-1">
                Period
              </label>
              <select id="period" name="period" className="form-select form-select-sm" defaultValue={data.selectedPeriod}>
                <option value="today">Today</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="startDate" className="form-label small text-muted mb-1">
                Custom Start Date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                className="form-control form-control-sm"
                defaultValue={data.customStartDate ?? ''}
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="endDate" className="form-label small text-muted mb-1">
                Custom End Date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                className="form-control form-control-sm"
                defaultValue={data.customEndDate ?? ''}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-sm btn-primary w-100">
                Apply
              </button>
            </div>
          </form>
          <div className="small text-muted mt-2">Current selection: {data.periodLabel}</div>
        </div>
      </div>

      {data.warnings.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <ul className="mb-0 ps-3">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card bg-white">
        <div className="card-header"><h2 className="h6 mb-0">Clinical Quality KPIs</h2></div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">{kpiCard('Open Escalations Assigned', String(data.clinical.openEscalationsAssigned), 'Current accountable queue')}</div>
            <div className="col-md-3">{kpiCard('Handoffs (30d)', String(data.clinical.handoffsSubmitted30d), 'Submitted by this nurse')}</div>
            <div className="col-md-3">{kpiCard('On-site Handoff Rate', `${data.clinical.handoffsOnsiteRatePct}%`, 'Geo-verified handoffs')}</div>
            <div className="col-md-3">{kpiCard('Handoff Ack (30d)', String(data.clinical.handoffAcknowledged30d), 'Acknowledged incoming handoffs')}</div>
          </div>
          <div className="small text-muted mt-2">Average handoff distance from patient location: {data.clinical.avgHandoffDistanceMeters}m</div>
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-header"><h2 className="h6 mb-0">Operations KPIs</h2></div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">{kpiCard('Scheduled Visits', String(data.operations.scheduledVisitsInPeriod), 'Within selected period')}</div>
            <div className="col-md-3">{kpiCard('Completed Visits', String(data.operations.completedVisitsInPeriod), 'Within selected period')}</div>
            <div className="col-md-3">{kpiCard('Completion Rate', `${data.operations.completionRatePct}%`, 'Completed / scheduled')}</div>
            <div className="col-md-3">{kpiCard('No-show Visits', String(data.operations.noShowVisitsInPeriod), 'Within selected period')}</div>
          </div>
          <div className="small text-muted mt-2">Average patient rating (completed visits in period): {data.operations.avgPatientRatingInPeriod || 0}</div>
        </div>
      </div>

      {data.operations.canViewOperationalDrilldown ? (
        <div className="card bg-white">
          <div className="card-header">
            <h2 className="h6 mb-0">Operational Drill-down</h2>
          </div>
          <div className="card-body d-grid gap-3">
            <div>
              <h3 className="h6">Upcoming Queue</h3>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Visit</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Patient</th>
                      <th>Service</th>
                      <th>Area</th>
                      <th className="text-end">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operations.upcomingVisits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-muted">No scheduled operational items in this period.</td>
                      </tr>
                    ) : (
                      data.operations.upcomingVisits.map((visit) => (
                        <tr key={visit.visitId}>
                          <td>{visit.visitCode}</td>
                          <td>{dateTimeLabel(visit.scheduledDate)}</td>
                          <td className="text-capitalize">{statusLabel(visit.status)}</td>
                          <td>
                            {data.operations.canViewPatientIdentifiers
                              ? visit.patientName ?? visit.patientCode
                              : `Code ${visit.patientCode}`}
                          </td>
                          <td>{visit.serviceName}</td>
                          <td>{visit.areaName ?? '—'}</td>
                          <td className="text-end">{currency(visit.payoutEgp)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="h6">Follow-up Required</h3>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Visit</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Patient</th>
                      <th>Service</th>
                      <th>Area</th>
                      <th className="text-end">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operations.followUpVisits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-muted">No no-show/rescheduled/cancelled visits in this period.</td>
                      </tr>
                    ) : (
                      data.operations.followUpVisits.map((visit) => (
                        <tr key={visit.visitId}>
                          <td>{visit.visitCode}</td>
                          <td>{dateTimeLabel(visit.scheduledDate)}</td>
                          <td className="text-capitalize">{statusLabel(visit.status)}</td>
                          <td>
                            {data.operations.canViewPatientIdentifiers
                              ? visit.patientName ?? visit.patientCode
                              : `Code ${visit.patientCode}`}
                          </td>
                          <td>{visit.serviceName}</td>
                          <td>{visit.areaName ?? '—'}</td>
                          <td className="text-end">{currency(visit.payoutEgp)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card bg-white">
        <div className="card-header"><h2 className="h6 mb-0">Finance & Payout KPIs</h2></div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">{kpiCard('Earned (Period)', currency(data.finance.earnedInPeriodEgp), 'From completed visits')}</div>
            <div className="col-md-3">{kpiCard('Paid (Period)', currency(data.finance.paidInPeriodEgp), 'From ProviderPayout records')}</div>
            <div className="col-md-3">{kpiCard('Pending Estimate', currency(data.finance.pendingEstimateEgp), 'Earned - Paid')}</div>
            <div className="col-md-3">{kpiCard('Last Payout', currency(data.finance.lastPayoutAmountEgp), dateLabel(data.finance.lastPayoutDate))}</div>
          </div>
          <div className="small text-muted mt-2">Finance values are workforce/business metrics only and must never include patient-identifiable data.</div>
        </div>
      </div>
    </div>
  );
}
