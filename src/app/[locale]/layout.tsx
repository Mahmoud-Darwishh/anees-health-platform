import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { locales, type Locale } from '@/i18n/request';
import WhatsAppButton from '@/components/common/WhatsAppButton';
import FloatingIconsOnScroll from '@/components/common/FloatingIconsOnScroll';
import PwaInstallPrompt from '@/components/common/PwaInstallPrompt';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import {
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  generateWebsiteSchema,
} from '@/lib/utils/structured-data';
import '@/styles/globals.scss';
import '@/styles/legacy.scss';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const normalizedLocale = locale === 'ar' ? 'ar' : 'en';

  return {
    manifest: `/manifest-${normalizedLocale}.webmanifest`,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
    const locale = (await params).locale;

    if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });
    const direction = locale === 'ar' ? 'rtl' : 'ltr';

  // Generate structured data for this locale
    const organizationSchema = generateOrganizationSchema(locale);
  const localBusinessSchema = generateLocalBusinessSchema();
    const websiteSchema = generateWebsiteSchema(locale);

  return (
      <NextIntlClientProvider messages={messages} locale={locale} timeZone="Africa/Cairo">
        <div dir={direction} lang={locale}>
        <a href="#main-content" className="skip-link">{t('skip_to_main_content')}</a>
        {/* Structured Data for SEO & GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {children}
        <FloatingIconsOnScroll />
        <WhatsAppButton />
        <MobileBottomNav />
        <PwaInstallPrompt />
      </div>
      {/* Bootstrap JS */}
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
    </NextIntlClientProvider>
  );
}