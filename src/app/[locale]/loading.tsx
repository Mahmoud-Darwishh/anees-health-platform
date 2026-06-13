import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Default streaming fallback for any page under `[locale]/*` that suspends while
 * loading server data. Static pages render instantly and never show this; only
 * dynamic pages (coverage, settings, …) that wait on the server do. Slower
 * surfaces with their own shape (portal, doctors) keep dedicated skeletons.
 *
 * `loading.tsx` receives no params, so we read the ambient request locale from
 * next-intl. Symmetric layout — reads correctly in both LTR and RTL.
 */
export default async function LocaleLoading() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'common' });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="container py-5" dir={dir} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{t('loading')}</span>

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
