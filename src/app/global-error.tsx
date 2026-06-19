'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/utils/observability';

/**
 * Last-resort boundary: catches errors thrown in the ROOT layout (and any
 * locale/admin/clinician layout above their own boundaries). It replaces the
 * entire document, so it must render its own <html>/<body> and rely ONLY on
 * inline styles — no SCSS modules, no fonts, no providers are guaranteed here.
 * Fires in production only. Bilingual by stacking EN + AR, since the locale
 * context is exactly what may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: 'app/global-error', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #fffdf8 0%, #f8efdc 100%)',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          color: '#132c4d',
          padding: '1.5rem',
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 520,
            width: '100%',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(166,131,65,0.22)',
            borderRadius: 24,
            padding: '2.25rem 1.5rem',
            boxShadow: '0 24px 48px rgba(104,69,7,0.16)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #a68341 0%, #E1C582 100%)',
              color: '#fff',
              marginBottom: '1rem',
            }}
          >
            <svg
              width="34"
              height="34"
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

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            We hit an unexpected problem
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(19,44,77,0.8)', margin: '0 0 0.25rem' }}>
            Your information is safe. Please try again.
          </p>
          <p dir="rtl" lang="ar" style={{ fontSize: '1rem', color: 'rgba(19,44,77,0.8)', margin: '0 0 1.5rem' }}>
            بياناتك آمنة. يُرجى المحاولة مرة أخرى.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: 999,
              padding: '0.7rem 1.6rem',
              background: 'linear-gradient(135deg, #a68341 0%, #E1C582 100%)',
              boxShadow: '0 12px 24px rgba(166,131,65,0.28)',
            }}
          >
            Try again · حاول مرة أخرى
          </button>

          {error.digest ? (
            <p style={{ fontSize: '0.78rem', color: 'rgba(19,44,77,0.55)', marginTop: '1.5rem', marginBottom: 0 }}>
              Reference code: <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
