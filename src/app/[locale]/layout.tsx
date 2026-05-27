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
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { getCoverageAreas } from '@/lib/seo/coverage';
import type { SupportedLocale } from '@/lib/seo/site';
import SessionProvider from '@/components/common/SessionProvider';
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
        <a href="#main-content" className="skip-link">{t('skip_to_main_content')}</a>
        {/* Site-wide JSON-LD — emitted ONCE here so we don't ship duplicate
            schema blocks from the root layout. Per-route JSON-LD (breadcrumb,
            FAQ, Physician, MedicalProcedure, Place) is emitted by each
            individual page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(lbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(wsSchema) }}
        />

        {children}
        <FloatingIconsOnScroll />
        <WhatsAppButton />
        <MobileBottomNav />
        <PwaInstallPrompt />
      </div>
      <Script id="chatling-script" strategy="lazyOnload">
        {`
          window.chtlConfig = { chatbotId: "9941775766" };
          (function () {
            var s = document.createElement('script');
            s.async = true;
            s.id = 'chtl-script';
            s.setAttribute('data-id', '9941775766');
            s.src = 'https://chatling.ai/js/embed.js';
            document.body.appendChild(s);
          })();
        `}
      </Script>
      {/* Bootstrap JS */}
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      </SessionProvider>
    </NextIntlClientProvider>
  );
}