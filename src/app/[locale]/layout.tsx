import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { locales } from '@/i18n/request';
import WhatsAppButton from '@/components/common/WhatsAppButton';
import '@/styles/globals.scss';
import '@/styles/legacy.scss';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const $locale = (await params).locale;

  if (!locales.includes($locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const direction = $locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <NextIntlClientProvider messages={messages} locale={$locale} timeZone="Africa/Cairo">
      <div dir={direction} lang={$locale}>
        {children}
        <WhatsAppButton />
      </div>
      {/* Bootstrap JS */}
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
    </NextIntlClientProvider>
  );
}