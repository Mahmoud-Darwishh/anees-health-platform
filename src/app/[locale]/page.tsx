import { Metadata } from 'next';
import Script from 'next/script';
import GeneralHomeOne from '@/components/sections/home/generalHomeOne';
import { buildHomeMetadata } from '@/lib/seo/metadata';
import {
  breadcrumbSchema,
  faqPageSchema,
  webPageSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { homeFaqs } from '@/lib/seo/faqs';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { getDoctors } from '@/lib/api/doctors';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildHomeMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: SupportedLocale = rawLocale === 'ar' ? 'ar' : 'en';

  const doctors = await getDoctors(locale);

  const breadcrumbs = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
  ];

  const homeBreadcrumb = breadcrumbSchema(breadcrumbs);
  const homeFaq = faqPageSchema(homeFaqs[locale]);
  const homeWebPage = webPageSchema({
    locale,
    path: `/${locale}`,
    name: site.labels.home[locale],
    description:
      locale === 'ar'
        ? 'أنيس هيلث — رعاية صحية منزلية في مصر: زيارات أطباء، تمريض، علاج طبيعي، وتحاليل في المنزل.'
        : 'Anees Health — home healthcare in Egypt: doctor home visits, skilled nursing, physiotherapy, and labs at home.',
    breadcrumbs,
  });

  return (
    <>
      <Script
        id="home-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(homeBreadcrumb) }}
      />
      <Script
        id="home-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(homeFaq) }}
      />
      <Script
        id="home-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(homeWebPage) }}
      />
      <GeneralHomeOne doctors={doctors} />
    </>
  );
}
