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
    title: locale === 'ar' ? 'احجز موعد - أنيس هيلث | رعاية منزلية' : 'Book Appointment | Anees Health - Home Healthcare',
    description:
      locale === 'ar'
        ? 'احجز زيارة منزلية أو استشارة عن بعد مع أطبائنا المتخصصين عبر أنيس. حجز سهل وآمن'
        : 'Book a home visit or telemedicine consultation with Anees specialists. Easy and secure appointment booking',
    keywords:
      locale === 'ar'
        ? 'أنيس، حجز موعد، زيارة منزلية، استشارة طبية، دكتور أونلاين، تطبيب عن بعد'
        : 'Anees, book appointment, home visit, doctor consultation, online doctor, telemedicine',
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

