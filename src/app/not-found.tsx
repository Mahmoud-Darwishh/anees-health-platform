import Link from 'next/link';
import styles from './not-found.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="container py-5">
          <div className={styles.glow} aria-hidden="true"></div>
          <div className={`mx-auto text-center ${styles.inner}`}>
            <span className={styles.badge}>404 Error</span>
            <div
              className={`d-inline-flex align-items-center justify-content-center rounded-circle mt-4 mb-3 ${styles.iconWrapper}`}
            >
              <LucideIcon iconClass="fa-solid fa-circle-exclamation" aria-hidden="true"></LucideIcon>
            </div>

            <p className={styles.code}>404</p>
            <h1 className={`fw-bold mb-3 ${styles.heading}`}>This Page Took A Wrong Turn</h1>
            <p className={`mb-4 ${styles.body}`}>
              The address is no longer available, or it may have moved. Jump back to a trusted page and continue your visit.
            </p>

            <div className={`d-flex gap-3 justify-content-center flex-wrap ${styles.actions}`}>
              <Link href="/" className="btn btn-primary">
                Back to Home
              </Link>
              <Link href="/en/booking" className="btn btn-outline-primary">
                Book a Visit
              </Link>
              <Link href="/en/doctors" className="btn btn-outline-secondary">
                Browse Doctors
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

