/**
 * Default streaming fallback for `/admin/*` pages that suspend on data. The
 * patient-detail route keeps its own richer skeleton (`patients/[id]/loading.tsx`);
 * this generic one covers every other admin screen so none flash blank.
 */
export default function AdminLoading() {
  return (
    <div className="container-fluid py-4" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>

      <div className="placeholder-glow mb-4">
        <span className="placeholder col-3 d-block mb-2" style={{ height: 24 }} />
        <span className="placeholder col-5 d-block" style={{ height: 14 }} />
      </div>

      <div className="row g-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="col-6 col-lg-3">
            <div className="card">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-6 d-block mb-2" style={{ height: 12 }} />
                <span className="placeholder col-4 d-block" style={{ height: 24 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body placeholder-glow">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="placeholder col-12 d-block mb-3" style={{ height: 16 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
