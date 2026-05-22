import { Metadata } from 'next';
import Script from 'next/script';
import GeneralHomeOne from '@/components/sections/home/generalHomeOne';
import { generateHomeMetadata } from '@/lib/utils/metadata';
import {
  generateBreadcrumbSchema,
  renderJsonLd,
} from '@/lib/utils/structured-data';
import { getDoctors } from '@/lib/api/doctors';
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

  // Fetch doctors for the homepage featured slider (first 6 are shown)
  const doctors = await getDoctors(locale as 'en' | 'ar');

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
      <GeneralHomeOne doctors={doctors} />
    </>
  );
}