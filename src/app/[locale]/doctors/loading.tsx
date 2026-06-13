import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Skeleton for the doctor listing — it waits on the DB (and filters), so a card
 * grid placeholder keeps the page from sitting blank during fetch. Symmetric
 * layout so it works in LTR and RTL without direction-specific rules.
 */
export default async function DoctorsLoading() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'common' });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="container py-5" dir={dir} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{t('loading')}</span>

      <div className="placeholder-glow text-center mb-5">
        <span className="placeholder col-4 d-inline-block mb-2" style={{ height: 28 }} />
        <span className="placeholder col-6 d-block mx-auto" style={{ height: 14 }} />
      </div>

      <div className="row g-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="col-12 col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="placeholder-glow">
                <span className="placeholder col-12 d-block" style={{ height: 200 }} />
              </div>
              <div className="card-body placeholder-glow">
                <span className="placeholder col-8 d-block mb-2" style={{ height: 16 }} />
                <span className="placeholder col-5 d-block mb-3" style={{ height: 12 }} />
                <span className="placeholder col-12 d-block" style={{ height: 36 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
