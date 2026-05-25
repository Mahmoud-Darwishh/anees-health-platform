import { Metadata } from 'next';
import Script from 'next/script';
import { getTranslations } from 'next-intl/server';
import { buildServicesMetadata } from '@/lib/seo/metadata';
import {
  breadcrumbSchema,
  faqPageSchema,
  servicesItemListSchema,
  aggregateOfferSchema,
  howToBookingSchema,
  renderJsonLd,
  type ServiceOfferInput,
} from '@/lib/seo/jsonld';
import { servicesFaqs, bookingFaqs } from '@/lib/seo/faqs';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { getContentServices } from '@/lib/api/content-services';
import { getBookingPrices } from '@/lib/api/pricing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seoLocale: SupportedLocale = locale === 'ar' ? 'ar' : 'en';
  return {
    ...buildServicesMetadata(seoLocale),
    category: seoLocale === 'ar' ? 'الرعاية الصحية المنزلية' : 'Home Healthcare Services',
    classification: seoLocale === 'ar' ? 'خدمات طبية منزلية' : 'Medical Services',
  };
}

export default async function ServicesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: SupportedLocale = rawLocale === 'ar' ? 'ar' : 'en';

  // Pull the services catalog from the DB and the title/description from
  // the locale message bundle (`services.items.<code>.title|description`).
  const [contentServices, bookingPrices, t] = await Promise.all([
    getContentServices(),
    getBookingPrices(),
    getTranslations({ locale, namespace: 'services.items' }),
  ]);

  const serviceInputs: ServiceOfferInput[] = contentServices.map((s) => ({
    code: s.code,
    landingSlug: s.landingSlug,
    name: t(`${s.code}.title`),
    description: t(`${s.code}.description`),
  }));

  const breadcrumbs = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.services[locale], url: `${site.baseUrl}/${locale}/services` },
  ];

  const crumbsLd = breadcrumbSchema(breadcrumbs);
  const itemListLd = servicesItemListSchema(locale, serviceInputs);
  const aggregateOfferLd = aggregateOfferSchema(locale, bookingPrices);
  const faqLd = faqPageSchema([...servicesFaqs[locale], ...bookingFaqs[locale]]);
  const howToLd = howToBookingSchema(locale);

  return (
    <>
      <Script
        id="services-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
      />
      <Script
        id="services-itemlist-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(itemListLd) }}
      />
      <Script
        id="services-aggregate-offer-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(aggregateOfferLd) }}
      />
      <Script
        id="services-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(faqLd) }}
      />
      <Script
        id="services-howto-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(howToLd) }}
      />
      {children}
    </>
  );
}
