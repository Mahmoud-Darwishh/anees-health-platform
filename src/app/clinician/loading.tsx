/**
 * Streaming fallback for `/clinician/*`. The workspace is `force-dynamic` and
 * waits on FHIR (today's visits, tasks, earnings), so a card-list skeleton keeps
 * the field UI from freezing on slow mobile connections.
 */
export default function ClinicianLoading() {
  return (
    <div className="px-2 py-3" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>

      <div className="placeholder-glow mb-3">
        <span className="placeholder col-6 d-block mb-2" style={{ height: 20 }} />
        <span className="placeholder col-4 d-block" style={{ height: 13 }} />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card border-0 shadow-sm mb-3">
          <div className="card-body placeholder-glow">
            <div className="d-flex align-items-center gap-3 mb-2">
              <span className="placeholder rounded-circle" style={{ width: 44, height: 44, display: 'inline-block' }} />
              <div className="flex-grow-1">
                <span className="placeholder col-7 d-block mb-2" style={{ height: 14 }} />
                <span className="placeholder col-4 d-block" style={{ height: 11 }} />
              </div>
            </div>
            <span className="placeholder col-12 d-block" style={{ height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
