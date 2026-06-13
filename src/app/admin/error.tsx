'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary for the whole `/admin/*` console. English-only, Bootstrap-
 * styled to sit inside the admin shell. Shows a recoverable card with the
 * server-generated digest as a support reference (never the raw error — it can
 * carry PHI). Does not catch errors thrown in `admin/layout.tsx` itself.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AdminErrorBoundary]', error);
    }
  }, [error]);

  return (
    <div className="container py-5" role="alert" aria-live="assertive">
      <div className="mx-auto text-center" style={{ maxWidth: 560 }}>
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{ width: 64, height: 64, background: '#FFE8E8', color: '#c0392b' }}
          aria-hidden="true"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="h4 fw-bold mb-2">Something went wrong</h1>
        <p className="text-muted mb-4">
          This screen hit an unexpected error. Your data is safe. Try again, and if it persists, share the
          reference code below with engineering.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap mb-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/admin" className="btn btn-outline-secondary">
            Back to dashboard
          </Link>
        </div>
        {error.digest ? (
          <p className="small text-muted mb-0">
            Reference code: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
