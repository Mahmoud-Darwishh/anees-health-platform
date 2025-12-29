import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="py-5" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}>
      <div className="container py-5">
        <div className="mx-auto text-center" style={{ maxWidth: '720px' }}>
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: 72, height: 72, background: 'rgba(170, 134, 66, 0.12)', color: '#aa8642', fontSize: '1.75rem' }}>
            <i className="isax isax-danger" aria-hidden="true"></i>
          </div>
          <h1 className="fw-bold mb-3" style={{ fontSize: '2rem' }}>Page Not Found</h1>
          <p className="text-muted mb-4" style={{ fontSize: '1rem' }}>
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
