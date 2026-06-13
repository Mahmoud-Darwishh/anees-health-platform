import { Metadata } from 'next';
import Script from 'next/script';
import DoctorGrid from '@/features/doctors/components/doctorgrid/doctors-grid';
import { buildDoctorsMetadata } from '@/lib/seo/metadata';
// Route-scoped styles — only the doctors listing page ships this CSS.
import '@/assets/scss/pages/doctor-grid.scss';
import {
  physiciansItemListSchema,
  breadcrumbSchema,
  webPageSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { getDoctors } from '@/lib/api/doctors';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildDoctorsMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function DoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: SupportedLocale = rawLocale === 'ar' ? 'ar' : 'en';

  const doctors = await getDoctors(locale);

  const breadcrumbs = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.doctors[locale], url: `${site.baseUrl}/${locale}/doctors` },
  ];

  // Profile link looks like /<locale>/doctors/<slug>; extract slug.
  const itemList = physiciansItemListSchema(locale, doctors, (d) =>
    d.profileLink.replace(/\/$/, '').split('/').pop() || ''
  );
  const crumbs = breadcrumbSchema(breadcrumbs);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/doctors`,
    name: site.labels.doctors[locale],
    description:
      locale === 'ar'
        ? 'أطباء أنيس هيلث المعتمدون لزيارات المنزل والاستشارة عن بُعد في مصر.'
        : 'Anees Health verified physicians for home visits and telemedicine across Egypt.',
    breadcrumbs,
  });

  return (
    <>
      <Script
        id="doctors-itemlist-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(itemList) }}
      />
      <Script
        id="doctors-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }}
      />
      <Script
        id="doctors-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }}
      />
      <DoctorGrid doctors={doctors} />
    </>
  );
}
