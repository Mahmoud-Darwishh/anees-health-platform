import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// List of supported locales
export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment.
  // In dev, requestLocale can be undefined during middleware churn/HMR.
  const incomingLocale = await requestLocale;
  const locale = incomingLocale ?? defaultLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});