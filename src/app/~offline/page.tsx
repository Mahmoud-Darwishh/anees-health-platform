import Link from 'next/link';
// This route renders under the ROOT layout, which does NOT load globals.scss,
// so the design tokens (var(--color-*), var(--surface-*), …) are otherwise
// undefined here. Import the runtime token :root block directly so the offline
// page and its quick-links render in full brand styling.
import '@/assets/scss/base/tokens.scss';
import styles from './offline.module.scss';
import RetryButton from './RetryButton';
import OfflineQuickLinks from './OfflineQuickLinks';

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="offline-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/img/anees-app-icon-192.png"
          alt="Anees Health"
          width={72}
          height={72}
          className={styles.logo}
        />

        <div className={styles.iconWrap} aria-hidden="true">
          <svg
            className={styles.wifiIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
        </div>

        <h1 id="offline-title" className={styles.title}>
          <span lang="en">You&apos;re offline</span>
          <span className={styles.divider} aria-hidden="true"> / </span>
          <span lang="ar">أنت غير متصل</span>
        </h1>

        <p className={styles.description} lang="en">
          Anees can still show saved public pages. Clinical, payment, and account pages stay protected until the internet returns.
        </p>
        <p className={styles.descriptionAr} lang="ar" dir="rtl">
          يمكن لأنيس عرض الصفحات العامة المحفوظة. صفحات الحساب والدفع والبيانات الطبية تبقى محمية حتى يعود الاتصال.
        </p>

        <div className={styles.actions}>
          <RetryButton />
          <Link href="/en" className={styles.homeLink}>
            English home
          </Link>
          <Link href="/ar" className={styles.homeLink}>
            الرئيسية
          </Link>
        </div>

        <OfflineQuickLinks />

        <p className={styles.hint} lang="en">
          For best offline access, open the pages you need once while connected.
        </p>
      </section>
    </main>
  );
}
