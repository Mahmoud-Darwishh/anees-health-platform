import { Metadata } from 'next';
import Script from 'next/script';
import { config } from '@/lib/config';
import { generateBreadcrumbSchema, renderJsonLd } from '@/lib/utils/structured-data';
import BookingPageContent from './page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'ar' ? 'حجز الموعد' : 'Book Appointment',
    description:
      locale === 'ar'
        ? 'احجز موعد مع طبيبك المفضل لزيارة منزلية أو استشارة طبية عن بعد'
        : 'Book an appointment with your preferred doctor for home visits or telemedicine consultations',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;

  // Breadcrumb schema (not indexed, so minimal schema)
  const breadcrumbs = [
    {
      name: locale === 'ar' ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${locale}`,
    },
    {
      name: locale === 'ar' ? 'حجز الموعد' : 'Booking',
      url: `${baseUrl}/${locale}/booking`,
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <>
      {/* Breadcrumb Schema (not for indexing, just for structure) */}
      <Script
        id="booking-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <BookingPageContent locale={locale} />
    </>
  );
}

