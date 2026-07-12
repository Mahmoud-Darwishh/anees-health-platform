/**
 * Default streaming fallback for any page under `[locale]/*` that suspends while
 * loading server data. Kept locale-agnostic ON PURPOSE: reading the request
 * locale here (via next-intl's ambient `getLocale()`) reads request headers,
 * which opts the whole `[locale]` segment into dynamic rendering and defeats
 * static/ISR caching. The layout is symmetric (works in LTR + RTL), and
 * `aria-busy`/`aria-live` already announce the loading state to assistive tech,
 * so no translated text is needed here.
 */
export default function LocaleLoading() {
  return (
    <div className="container py-5" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>

      <div className="placeholder-glow text-center mb-5">
        <span className="placeholder col-4 d-inline-block mb-2" style={{ height: 26 }} />
        <span className="placeholder col-6 d-block mx-auto" style={{ height: 14 }} />
      </div>

      <div className="row g-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="col-12 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-5 d-block mb-3" style={{ height: 18 }} />
                <span className="placeholder col-12 d-block mb-2" style={{ height: 12 }} />
                <span className="placeholder col-9 d-block" style={{ height: 12 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
