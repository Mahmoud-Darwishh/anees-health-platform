import type { PortalTranslator } from './types';

/**
 * Locale-aware date/datetime formatters. Centralises the `ar-EG` / `en-GB`
 * choice that was previously copy-pasted ~10× across the portal page. Returns
 * `fallback` (default `—`) for empty values so call sites stay terse.
 */
export function makeFormatters(locale: string) {
  const intlLocale = locale === 'ar' ? 'ar-EG' : 'en-GB';

  const formatDate = (value?: string | null, fallback = '—'): string =>
    value ? new Date(value).toLocaleDateString(intlLocale) : fallback;

  const formatDateTime = (value?: string | null, fallback = '—'): string =>
    value ? new Date(value).toLocaleString(intlLocale) : fallback;

  return { formatDate, formatDateTime };
}

export type PortalFormatters = ReturnType<typeof makeFormatters>;

/** Maps a FHIR encounter status to a portal i18n status key (or null). */
export function toVisitStatusKey(
  status?: string,
): 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | null {
  switch (status) {
    case 'planned':
      return 'scheduled';
    case 'in-progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return null;
  }
}

/** Human label for an encounter's service type, falling back to a coded key. */
export function encounterTypeLabel(encounter: {
  serviceType?: Array<{ coding?: Array<{ code?: string; display?: string }> }>;
}): string {
  const coding = encounter.serviceType?.[0]?.coding?.[0];
  if (coding?.display) {
    return coding.display;
  }

  switch (coding?.code) {
    case 'in_home':
      return 'in_home';
    case 'clinic':
      return 'clinic';
    case 'virtual':
      return 'virtual';
    default:
      return '—';
  }
}

/** Time-of-day greeting (morning/afternoon/evening) in the active locale. */
export function dayGreeting(t: PortalTranslator): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return t('greetings.morning');
  }
  if (hour < 18) {
    return t('greetings.afternoon');
  }
  return t('greetings.evening');
}
