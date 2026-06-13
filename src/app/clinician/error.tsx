'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary for the `/clinician/*` workspace. English-only and mobile-first
 * to match the field-facing clinician shell. Recoverable card with a "Try again"
 * and a route home; surfaces the digest (never the raw error — PHI risk).
 */
export default function ClinicianError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ClinicianErrorBoundary]', error);
    }
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '1.5rem',
        gap: '0.5rem',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFE8E8',
          color: '#c0392b',
          marginBottom: '0.75rem',
        }}
      >
        <svg
          width="28"
          height="28"
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
      <h1 className="h5 fw-bold mb-1">Something went wrong</h1>
      <p className="text-muted mb-3" style={{ maxWidth: 360 }}>
        This screen hit an unexpected error. Your work is safe — please try again.
      </p>
      <div className="d-flex gap-2 justify-content-center flex-wrap">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/clinician/today" className="btn btn-outline-secondary">
          Back to my day
        </Link>
      </div>
      {error.digest ? (
        <p className="small text-muted mt-3 mb-0">
          Reference code: <code>{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
