import type { ClinicianEarningsData } from './data';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-EG', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function EarningsPageView({ data }: { data: ClinicianEarningsData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">Earnings</h2>
        <p className="text-muted mb-0">Weekly and monthly payout snapshots from completed and checked-out visits.</p>
      </header>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      <section className="clinician-stats-grid mb-3">
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">This week</p>
          <p className="clinician-stat-value mb-0">{data.weekVisits} visits</p>
          <p className="small text-muted mb-0">{formatCurrency(data.weekEarningsEgp)} EGP</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">This month</p>
          <p className="clinician-stat-value mb-0">{data.monthVisits} visits</p>
          <p className="small text-muted mb-0">{formatCurrency(data.monthEarningsEgp)} EGP</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">All time</p>
          <p className="clinician-stat-value mb-0">{data.allTimeVisits} visits</p>
          <p className="small text-muted mb-0">{formatCurrency(data.allTimeEarningsEgp)} EGP</p>
        </article>
      </section>

      <article className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h3 className="h6 mb-2">Upcoming payout snapshot</h3>
          <p className="small text-muted mb-1">
            Current period visits: {data.currentPeriodVisits} · Expected: {formatCurrency(data.currentPeriodEgp)} EGP
          </p>
          <p className="small text-muted mb-0">Next payout date: {data.nextPayoutDateLabel ?? 'Not available'}</p>
        </div>
      </article>

      {data.recentVisits.length === 0 ? (
        <div className="alert alert-light border mb-0">No visit earnings recorded yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Service</th>
                <th>Earned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentVisits.map((visit) => (
                <tr key={visit.id}>
                  <td>{formatDateLabel(visit.visitDateIso)}</td>
                  <td>{visit.patientInitials}</td>
                  <td>{visit.serviceCode}</td>
                  <td>{formatCurrency(visit.netEgp)} EGP</td>
                  <td>{visit.stateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}