import type { Metadata } from 'next';
import Script from 'next/script';
import { setRequestLocale } from 'next-intl/server';
import CoveragePageContent from '@/features/coverage/components/CoveragePageContent';
import { buildCoverageMetadata } from '@/lib/seo/metadata';
import {
  breadcrumbSchema,
  coveragePlaceSchema,
  faqPageSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { getCoverageAreas } from '@/lib/seo/coverage';
import { coverageFaqs } from '@/lib/seo/faqs';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildCoverageMetadata((locale === 'ar' ? 'ar' : 'en') as SupportedLocale);
}

export default async function CoveragePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const $locale = (await params).locale;
  setRequestLocale($locale);
  const loc = ($locale === 'ar' ? 'ar' : 'en') as SupportedLocale;
  const baseUrl = site.baseUrl;
  const areas = await getCoverageAreas();

  const crumbsLd = breadcrumbSchema([
    { name: site.labels.home[loc], url: `${baseUrl}/${loc}` },
    { name: site.labels.coverage[loc], url: `${baseUrl}/${loc}/coverage` },
  ]);
  const placeLd = coveragePlaceSchema(loc, areas);
  const faqLd = faqPageSchema(coverageFaqs[loc]);

  return (
    <>
      <Script
        id="coverage-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
      />
      <Script
        id="coverage-place-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(placeLd) }}
      />
      <Script
        id="coverage-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(faqLd) }}
      />
      <CoveragePageContent locale={$locale} />
    </>
  );
}
