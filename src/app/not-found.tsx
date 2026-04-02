import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <main className={`py-5 ${styles.page}`}>
      <div className="container py-5">
        <div className={`mx-auto text-center ${styles.inner}`}>
          <div className={`d-inline-flex align-items-center justify-content-center rounded-circle mb-3 ${styles.iconWrapper}`}>
            <i className="isax isax-danger" aria-hidden="true"></i>
          </div>
          <h1 className={`fw-bold mb-3 ${styles.heading}`}>Page Not Found</h1>
          <p className={`text-muted mb-4 ${styles.body}`}>
            We could not find the page you were looking for. Please check the URL or head back home.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link href="/" className="btn btn-primary">
              Go to Home
            </Link>
            <Link href="/en/doctors" className="btn btn-outline-primary">
              Browse Doctors
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
