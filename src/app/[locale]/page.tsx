import { Metadata } from 'next';
import Script from 'next/script';
import GeneralHomeOne from '@/components/sections/home/generalHomeOne';
import { generateHomeMetadata } from '@/lib/utils/metadata';
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
  return generateHomeMetadata(locale);
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;

  // Homepage breadcrumb
  const breadcrumbs = [
    {
      name: locale === 'ar' ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${locale}`,
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <>
      {/* Homepage Breadcrumb Schema */}
      <Script
        id="homepage-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <GeneralHomeOne />
    </>
  );
}