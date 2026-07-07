import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { locales, type Locale } from '@/i18n/request';
import WhatsAppButton from '@/components/common/WhatsAppButton';
import FloatingIconsOnScroll from '@/components/common/FloatingIconsOnScroll';
import PwaInstallPrompt from '@/components/common/PwaInstallPrompt';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import {
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { getCoverageAreas } from '@/lib/seo/coverage';
import type { SupportedLocale } from '@/lib/seo/site';
import SessionProvider from '@/components/common/SessionProvider';
import '@/styles/globals.scss';

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

  const messages = await getMessages({ locale });
    const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const seoLocale: SupportedLocale = locale === 'ar' ? 'ar' : 'en';

  // Coverage feeds LocalBusiness.areaServed so the schema reflects the
  // real GeoJSON instead of a hardcoded city. Adding a feature to the
  // GeoJSON automatically expands the served area list.
  const coverageAreas = await getCoverageAreas();
  const orgSchema = organizationSchema(seoLocale);
  const lbSchema = localBusinessSchema(seoLocale, coverageAreas);
  const wsSchema = websiteSchema(seoLocale);

  return (
      <NextIntlClientProvider messages={messages} locale={locale} timeZone="Africa/Cairo">
      <SessionProvider>
        <div dir={direction} lang={locale}>
        {/* Site-wide JSON-LD — emitted ONCE here so we don't ship duplicate
            schema blocks from the root layout. Per-route JSON-LD (breadcrumb,
            FAQ, Physician, MedicalProcedure, Place) is emitted by each
            individual page. */}
        <Script
          id="organization-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(orgSchema) }}
        />
        <Script
          id="local-business-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(lbSchema) }}
        />
        <Script
          id="website-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(wsSchema) }}
        />

        {children}
        <FloatingIconsOnScroll />
        <WhatsAppButton />
        <MobileBottomNav />
        <PwaInstallPrompt />
      </div>
      {/* Chatling chatbot removed for now (was lazy-loaded here). */}
      {/* Bootstrap JS — self-hosted (pinned v5.3.0). */}
      <Script
        src="/assets/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
