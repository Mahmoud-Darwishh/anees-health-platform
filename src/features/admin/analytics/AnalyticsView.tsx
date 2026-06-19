import type { OwnerAnalytics } from './data';

const egp = (n: number) => `${n.toLocaleString('en-US')} EGP`;
const titleCase = (s: string) => s.replace(/_/g, ' ');

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card bg-white h-100">
        <div className="card-body">
          <p className="text-muted small mb-1">{label}</p>
          <p className="h4 mb-0">{value}</p>
          {hint ? <p className="text-muted small mb-0">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CountTable({ title, rows, emptyText }: { title: string; rows: { label: string; count: number }[]; emptyText: string }) {
  return (
    <div className="card bg-white h-100">
      <div className="card-body">
        <h2 className="h6">{title}</h2>
        {rows.length === 0 ? (
          <div className="alert alert-light border mb-0">{emptyText}</div>
        ) : (
          <table className="table table-sm align-middle mb-0">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="text-capitalize">{r.label}</td>
                  <td className="text-end fw-semibold">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function AnalyticsView({ data }: { data: OwnerAnalytics }) {
  return (
    <div className="d-flex flex-column gap-4">
      <div className="row g-3">
        <Kpi label="Revenue · this month" value={egp(data.revenue.thisMonthEgp)} hint={`${data.revenue.paymentsThisMonth} payments`} />
        <Kpi label="Revenue · last 30 days" value={egp(data.revenue.last30dEgp)} />
        <Kpi label="Revenue · all time" value={egp(data.revenue.allTimeEgp)} />
        <Kpi label="Booking → paid" value={`${data.conversionRatePct}%`} hint="conversion rate" />
        <Kpi label="Visits completed · this month" value={String(data.completedThisMonth)} />
        <Kpi label="Repeat patient rate" value={`${data.repeatPatientRatePct}%`} hint="patients with 2+ completed visits" />
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <CountTable
            title="Bookings funnel"
            rows={data.funnel.map((r) => ({ label: titleCase(r.status), count: r.count }))}
            emptyText="No bookings yet."
          />
        </div>
        <div className="col-12 col-lg-4">
          <CountTable
            title="Visits this month"
            rows={data.visitsThisMonth.map((r) => ({ label: titleCase(r.status), count: r.count }))}
            emptyText="No visits this month."
          />
        </div>
        <div className="col-12 col-lg-4">
          <CountTable
            title="Bookings by area"
            rows={data.coverage.map((r) => ({ label: titleCase(r.governorate), count: r.count }))}
            emptyText="No area data yet."
          />
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Clinician utilization — completed this month</h2>
          {data.topClinicians.length === 0 ? (
            <div className="alert alert-light border mb-0">No completed visits this month.</div>
          ) : (
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Clinician</th><th>Role</th><th className="text-end">Completed visits</th></tr></thead>
              <tbody>
                {data.topClinicians.map((c, i) => (
                  <tr key={`${c.name}-${i}`}>
                    <td>{c.name}</td>
                    <td className="text-capitalize">{c.role}</td>
                    <td className="text-end fw-semibold">{c.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-muted small mb-0">
        Revenue reflects recorded payments (card + confirmed InstaPay). Generated {new Date(data.generatedAtIso).toLocaleString('en-GB')}.
      </p>
    </div>
  );
}
