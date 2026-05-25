import type { Metadata } from 'next';
import Script from 'next/script';
import { buildBookingMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { getBookingPrices } from '@/lib/api/pricing';
import { getSpecialties } from '@/lib/api/specialties';
import BookingPageContent from './page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildBookingMetadata((locale === 'ar' ? 'ar' : 'en') as SupportedLocale);
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (locale === 'ar' ? 'ar' : 'en') as SupportedLocale;
  const baseUrl = site.baseUrl;

  const [prices, specialties] = await Promise.all([
    getBookingPrices(),
    getSpecialties(),
  ]);

  // Breadcrumb schema (page is noindex, but breadcrumbs still help)
  const crumbsLd = breadcrumbSchema([
    { name: site.labels.home[loc], url: `${baseUrl}/${loc}` },
    { name: site.labels.booking[loc], url: `${baseUrl}/${loc}/booking` },
  ]);

  return (
    <>
      {/* Breadcrumb Schema (not for indexing, just for structure) */}
      <Script
        id="booking-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
      />
      <BookingPageContent locale={locale} prices={prices} specialties={specialties} />
    </>
  );
}

