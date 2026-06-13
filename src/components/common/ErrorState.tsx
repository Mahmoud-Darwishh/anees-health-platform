'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './ErrorState.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

type Locale = 'en' | 'ar';

/**
 * Branded, bilingual error UI shared by every `error.tsx` boundary under
 * `[locale]/*`. It is deliberately SELF-CONTAINED (its own EN/AR copy, no
 * `next-intl` provider, no server data) so it still renders correctly even when
 * the failure that triggered it is upstream — a broken i18n provider, a failed
 * layout fetch, etc. An error screen must never be able to throw its own error.
 *
 * `error.digest` is a server-generated hash (never the raw message/stack), so
 * it is safe to surface to the patient as a support reference and carries no PHI.
 */
const copy: Record<
  Locale,
  {
    badge: string;
    title: string;
    message: string;
    tryAgain: string;
    home: string;
    reference: string;
  }
> = {
  en: {
    badge: 'Something went wrong',
    title: 'We hit an unexpected problem',
    message:
      'Your information is safe — this is on our side. Please try again, and if it keeps happening, contact our team and we’ll sort it out.',
    tryAgain: 'Try again',
    home: 'Back to home',
    reference: 'Reference code',
  },
  ar: {
    badge: 'حدث خطأ ما',
    title: 'واجهتنا مشكلة غير متوقعة',
    message:
      'بياناتك آمنة، والمشكلة من جانبنا. يُرجى المحاولة مرة أخرى، وإذا استمرت تواصل مع فريقنا وسنحلها فورًا.',
    tryAgain: 'حاول مرة أخرى',
    home: 'العودة للرئيسية',
    reference: 'رمز المرجع',
  },
};

export default function ErrorState({
  error,
  reset,
  locale = 'en',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  locale?: Locale;
}) {
  const t = copy[locale] || copy.en;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Dev-only console surface. We never log the raw error in production — the
    // message/stack can contain PHI. Observability (Sentry) is the planned home
    // for structured, scrubbed reporting (see EHR_NOW Sprint 5).
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error);
    }
  }, [error]);

  return (
    <main className={styles.page} dir={dir}>
      <section className={styles.hero}>
        <div className="container py-5">
          <div className={styles.glow} aria-hidden="true"></div>

          <div className={`mx-auto text-center ${styles.inner}`} role="alert" aria-live="assertive">
            <span className={styles.badge}>{t.badge}</span>
            <div
              className={`d-inline-flex align-items-center justify-content-center rounded-circle mt-4 mb-3 ${styles.iconWrapper}`}
            >
              <LucideIcon iconClass="fa-solid fa-exclamation-triangle" aria-hidden="true"></LucideIcon>
            </div>

            <h1 className={`fw-bold mb-3 ${styles.heading}`}>{t.title}</h1>
            <p className={`mb-4 ${styles.body}`}>{t.message}</p>

            <div className={`d-flex gap-3 justify-content-center flex-wrap ${styles.actions}`}>
              <button type="button" onClick={reset} className="btn btn-primary">
                {t.tryAgain}
              </button>
              <Link href={`/${locale}`} className="btn btn-outline-primary">
                {t.home}
              </Link>
            </div>

            {error.digest ? (
              <p className={styles.reference}>
                {t.reference}: <code>{error.digest}</code>
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
