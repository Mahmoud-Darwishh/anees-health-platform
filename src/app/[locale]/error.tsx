'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import ErrorState from '@/components/common/ErrorState';
import { reportError } from '@/lib/utils/observability';

/**
 * Error boundary for every page under `[locale]/*` (home, doctors, booking,
 * coverage, portal, settings, …). Catches render/data errors in those pages and
 * shows the branded bilingual recovery screen with a working "Try again".
 *
 * Note: this boundary does NOT catch errors thrown inside `[locale]/layout.tsx`
 * itself — those bubble to the root and are handled by `global-error.tsx`.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    // Forward public-site + patient-portal errors to the observability seam
    // (structured-logs always; Sentry once a DSN is set). Never PHI — the seam
    // keeps message-level detail only.
    reportError(error, { boundary: 'app/[locale]/error', digest: error.digest });
  }, [error]);

  return <ErrorState error={error} reset={reset} locale={locale} />;
}
