'use client';

import { useParams } from 'next/navigation';
import ErrorState from '@/components/common/ErrorState';

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

  return <ErrorState error={error} reset={reset} locale={locale} />;
}
