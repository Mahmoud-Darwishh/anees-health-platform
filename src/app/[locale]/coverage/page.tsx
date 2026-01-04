import { Metadata } from 'next';
import Script from 'next/script';
import CoveragePageContent from '@/components/sections/coverage/CoveragePageContent';
import { generateCoverageMetadata } from '@/lib/utils/metadata';
import {
  generateBreadcrumbSchema,
  renderJsonLd,
} from '@/lib/utils/structured-data';
import { config } from '@/lib/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateCoverageMetadata(locale);
}

export default async function CoveragePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const $locale = (await params).locale;
  const baseUrl = config.api.baseUrl;

  // Breadcrumb schema for coverage page
  const breadcrumbs = [
    {
      name: $locale === 'ar' ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${$locale}`,
    },
    {
      name: $locale === 'ar' ? 'منطقة التغطية' : 'Coverage',
      url: `${baseUrl}/${$locale}/coverage`,
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <>
      {/* Breadcrumb Schema */}
      <Script
        id="coverage-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <CoveragePageContent locale={$locale} />
    </>
  );
}
