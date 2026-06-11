// Streaming skeleton for the patient EHR detail page. Because the page is
// `force-dynamic` and loads many Medplum/Postgres resources before render, this
// fallback paints instantly (and on every tab navigation) so the workspace never
// looks frozen while data streams in.
export default function AdminPatientDetailLoading() {
  return (
    <div className="container-fluid py-4" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading patient record…</span>

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="placeholder-glow">
          <span className="placeholder rounded-circle" style={{ width: 56, height: 56, display: 'inline-block' }} />
        </div>
        <div className="flex-grow-1 placeholder-glow">
          <span className="placeholder col-4 d-block mb-2" style={{ height: 20 }} />
          <span className="placeholder col-2 d-block" style={{ height: 14 }} />
        </div>
      </div>

      {/* Tab strip */}
      <div className="d-flex gap-2 mb-4 placeholder-glow flex-wrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="placeholder rounded" style={{ width: 92, height: 32 }} />
        ))}
      </div>

      {/* Content cards */}
      <div className="row g-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="col-md-6">
            <div className="card">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-5 d-block mb-3" style={{ height: 16 }} />
                <span className="placeholder col-12 d-block mb-2" style={{ height: 12 }} />
                <span className="placeholder col-10 d-block mb-2" style={{ height: 12 }} />
                <span className="placeholder col-8 d-block" style={{ height: 12 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
