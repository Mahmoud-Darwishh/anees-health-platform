import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Tailored skeleton for the patient portal — the slowest bilingual surface,
 * since it fans out to multiple Medplum resources per tab. Painting the tab
 * strip + card shells immediately (instead of the generic spinner) makes the
 * portal feel responsive on the mobile networks our patients actually use.
 *
 * Layout is intentionally symmetric so it reads correctly in both LTR and RTL
 * without direction-specific rules. Uses Bootstrap placeholders (loaded app-wide).
 */
export default async function PortalLoading() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'common' });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="container py-4" dir={dir} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{t('loadingRecords')}</span>

      {/* Patient header */}
      <div className="d-flex align-items-center gap-3 mb-4 placeholder-glow">
        <span className="placeholder rounded-circle" style={{ width: 60, height: 60, display: 'inline-block' }} />
        <div className="flex-grow-1">
          <span className="placeholder col-4 d-block mb-2" style={{ height: 22 }} />
          <span className="placeholder col-2 d-block" style={{ height: 14 }} />
        </div>
      </div>

      {/* Tab strip (overview, clinical, files, care, visits, vitals, notes, tasks) */}
      <div className="d-flex gap-2 mb-4 placeholder-glow flex-wrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="placeholder rounded-pill" style={{ width: 88, height: 34 }} />
        ))}
      </div>

      {/* Content cards */}
      <div className="row g-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-5 d-block mb-3" style={{ height: 18 }} />
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
