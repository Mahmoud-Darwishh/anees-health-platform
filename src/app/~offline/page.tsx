import styles from './offline.module.scss';
import RetryButton from './RetryButton';

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="offline-title">
        {/* App icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/img/fav.png"
          alt="Anees Health"
          width={64}
          height={64}
          className={styles.logo}
        />

        {/* Wifi-off icon */}
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
          <span lang="en">No Internet Connection</span>
          <span className={styles.divider} aria-hidden="true"> · </span>
          <span lang="ar">لا يوجد اتصال بالإنترنت</span>
        </h1>

        <p className={styles.description} lang="en">
          You&apos;re offline. Pages you&apos;ve visited recently may still be available — try going back or
          check your connection.
        </p>
        <p className={styles.descriptionAr} lang="ar">
          أنت غير متصل بالإنترنت. الصفحات التي زرتها مؤخراً قد تكون متاحة — جرّب الرجوع أو تحقق من الاتصال.
        </p>

        <div className={styles.actions}>
          <RetryButton />
          <a href="/" className={styles.homeLink}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go Home / الصفحة الرئيسية
          </a>
        </div>

        <p className={styles.hint} lang="en">
          Tip: pages like Booking and Doctors are available offline after your first visit.
        </p>
      </section>
    </main>
  );
}
