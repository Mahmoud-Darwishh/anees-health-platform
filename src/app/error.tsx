'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/utils/observability';

/**
 * Root error boundary (Phase 9). Catches render/runtime errors in any segment
 * that lacks its own boundary, shows a calm recovery UI instead of a crash, and
 * forwards the error to the observability seam (Sentry-ready). The `digest` is a
 * server-side hash the user can quote to support — no PHI is shown.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: 'app/error', digest: error.digest });
  }, [error]);

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 560 }}>
      <h1 className="h4 mb-3">Something went wrong</h1>
      <p className="text-muted mb-4">An unexpected error occurred. The team has been notified — please try again.</p>
      {error.digest ? <p className="small text-muted mb-4">Reference: {error.digest}</p> : null}
      <button type="button" className="btn btn-outline-secondary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
