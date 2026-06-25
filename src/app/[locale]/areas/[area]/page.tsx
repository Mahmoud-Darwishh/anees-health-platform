/**
 * Area landing — /[locale]/areas/[area]
 *
 * One local-SEO page per Greater-Cairo neighbourhood, listing the home services
 * available there and linking to the service hubs + coverage map. Emits a Place
 * + WebPage + FAQ + Breadcrumb JSON-LD (no second LocalBusiness node, to avoid
 * forking the site-wide business entity).
 */
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import ContentHero from '@/components/common/content/ContentHero';
import ContentCard from '@/components/common/content/ContentCard';
import { serviceIcon } from '@/lib/seo/icons';
import { buildAreaMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, faqPageSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { coverageFaqs } from '@/lib/seo/faqs';
import { getArea, getAllAreaSlugs } from '@/lib/seo/areas';
import { getAllServiceLandingSlugs, getServiceLanding } from '@/lib/seo/search-discovery';
import { config } from '@/lib/config';
import { site, bcp47, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = getAllAreaSlugs();
  const locales = config.locales.supported as ('en' | 'ar')[];
  return locales.flatMap((locale) => slugs.map((area) => ({ locale, area })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}): Promise<Metadata> {
  const { locale: raw, area: slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const area = getArea(locale, slug);
  if (!area) {
    return {
      title: locale === 'ar' ? 'المنطقة غير موجودة' : 'Area not found',
      robots: { index: false, follow: true },
    };
  }
  return buildAreaMetadata({ locale, slug, name: area.name, governorate: area.governorate });
}

export default async function AreaLandingPage({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}) {
  const { locale: raw, area: slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const area = getArea(locale, slug);
  if (!area) notFound();

  const services = getAllServiceLandingSlugs()
    .map((s) => getServiceLanding(locale, s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const heroLead = isAr
    ? `توفّر أنيس هيلث رعاية صحية منزلية متكاملة في ${area.name} (${area.governorate}) — زيارات أطباء، تمريض منزلي، علاج طبيعي، وتحاليل في المنزل — بكادر طبي مرخّص وأسعار واضحة قبل الزيارة، وتنسيق من منسق واحد لكل حالة.`
    : `Anees Health provides complete home healthcare in ${area.name} (${area.governorate}) — doctor home visits, home nursing, physiotherapy, and lab tests at home — with licensed clinicians, prices shown before the visit, and one coordinator per case.`;

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: isAr ? 'مناطق التغطية' : 'Coverage areas', url: `${site.baseUrl}/${locale}/areas` },
    { name: area.name, url: `${site.baseUrl}/${locale}/areas/${slug}` },
  ];

  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    '@id': `${site.baseUrl}/${locale}/areas/${slug}`,
    name: isAr ? `${area.name}، ${area.governorate}، مصر` : `${area.name}, ${area.governorate}, Egypt`,
    inLanguage: bcp47(locale),
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: area.governorate,
      containedInPlace: { '@type': 'Country', name: 'Egypt' },
    },
  };
  const faq = faqPageSchema(coverageFaqs[locale]);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/areas/${slug}`,
    name: isAr ? `رعاية صحية منزلية في ${area.name}` : `Home Healthcare in ${area.name}`,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="area-place-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(placeSchema) }} />
      <Script id="area-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="area-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="area-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: isAr ? 'مناطق التغطية' : 'Coverage areas', href: `/${locale}/areas` },
          { label: area.name, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={isAr ? area.name : `${area.name}, ${area.governorate}`}
          title={isAr ? `رعاية صحية منزلية في ${area.name}` : `Home Healthcare in ${area.name}, ${area.governorate}`}
          lead={heroLead}
        />

        <section className="pt-5 pb-2">
          <div className="container">
            <h2 className="h4 mb-3">
              {isAr ? `الخدمات المنزلية المتاحة في ${area.name}` : `Home services available in ${area.name}`}
            </h2>
            <div className="row g-4">
              {services.map((s) => (
                <div key={s.slug} className="col-12 col-md-6 col-lg-4">
                  <ContentCard
                    href={`/${locale}/services/${s.slug}`}
                    icon={serviceIcon(s.slug)}
                    title={s.headline}
                    description={s.description}
                    cta={isAr ? 'تفاصيل' : 'Details'}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-4">
          <div className="container">
            <p className="mb-0">
              {isAr
                ? `للتأكد من تغطية عنوانك بدقة داخل ${area.name}، استخدم خريطة التغطية المباشرة قبل الحجز.`
                : `To confirm coverage for your exact address within ${area.name}, use the live coverage map before booking.`}{' '}
              <Link href={`/${locale}/coverage`}>{isAr ? 'افتح خريطة التغطية' : 'Open the coverage map'}</Link>.
            </p>
          </div>
        </section>

        <FaqSection
          heading={isAr ? 'أسئلة شائعة عن التغطية' : 'Coverage FAQ'}
          faqs={coverageFaqs[locale]}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/areas`, label: isAr ? 'كل المناطق' : 'All areas' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/coverage`, label: isAr ? 'خريطة التغطية' : 'Coverage map' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز الآن' : 'Book now' },
        ]}
      />
      <Footer />
    </>
  );
}
