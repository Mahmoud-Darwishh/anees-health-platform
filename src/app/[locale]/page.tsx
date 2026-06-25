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
import { getTranslations } from 'next-intl/server';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { getDoctors } from '@/lib/api/doctors';

export const revalidate = 3600;

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
  // Single-source the FAQ: build the schema from the SAME i18n messages the
  // visible <SectionFaq /> renders (home.faqs.q1..q5 / a1..a5), so the
  // structured data and the on-page copy can never drift apart.
  const tFaq = await getTranslations({ locale, namespace: 'home.faqs' });
  const homeFaqItems = [1, 2, 3, 4, 5].map((n) => ({
    question: tFaq(`q${n}`),
    answer: tFaq(`a${n}`),
  }));
  const homeFaq = faqPageSchema(homeFaqItems);
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
