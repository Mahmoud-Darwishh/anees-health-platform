import { Metadata } from 'next';
import Script from 'next/script';
import DoctorGrid from '@/components/doctors/doctorgrid/doctors-grid';
import { generateDoctorsMetadata } from '@/lib/utils/metadata';
import {
  generateDoctorsCollectionSchema,
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
  return generateDoctorsMetadata(locale);
}

export default async function DoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;

  // Fetch doctors for structured data (first 20 for schema)
  const doctors = await getDoctors(locale as 'en' | 'ar');
  const doctorsCollectionSchema = generateDoctorsCollectionSchema(
    doctors,
    locale,
    1 // current page
  );

  // Breadcrumb schema for doctors listing
  const breadcrumbs = [
    {
      name: locale === 'ar' ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${locale}`,
    },
    {
      name: locale === 'ar' ? 'الأطباء' : 'Doctors',
      url: `${baseUrl}/${locale}/doctors`,
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <>
      {/* Structured Data - Doctors Collection */}
      <Script
        id="doctors-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(doctorsCollectionSchema) }}
      />
      {/* Breadcrumb Schema */}
      <Script
        id="doctors-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <DoctorGrid />
    </>
  );
}
