/**
 * Services hub — /[locale]/services
 *
 * Pillar page for the home-healthcare service catalog. Renders the bilingual
 * service landings from `@/lib/seo/search-discovery` (data + copy already
 * existed; this route surfaces them) and emits ItemList + FAQ + WebPage +
 * Breadcrumb JSON-LD via the existing builders.
 */
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import { buildServicesMetadata } from '@/lib/seo/metadata';
import {
  servicesItemListSchema,
  faqPageSchema,
  webPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { servicesFaqs } from '@/lib/seo/faqs';
import { getAllServiceLandingSlugs, getServiceLanding } from '@/lib/seo/search-discovery';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildServicesMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const landings = getAllServiceLandingSlugs()
    .map((slug) => getServiceLanding(locale, slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const services = landings.map((s) => ({
    code: s.slug,
    name: s.headline,
    description: s.description,
    landingSlug: s.slug,
  }));

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.services[locale], url: `${site.baseUrl}/${locale}/services` },
  ];

  const heroLead = isAr
    ? 'يوفّر أنيس هيلث رعاية صحية منزلية متكاملة في القاهرة الكبرى — زيارات أطباء، تمريض منزلي، علاج طبيعي، تحاليل وأشعة في المنزل، ورعاية كبار السن وما بعد العمليات والأمراض المزمنة — بكادر طبي مرخّص وأسعار واضحة قبل الزيارة.'
    : 'Anees Health provides complete home healthcare across Greater Cairo — doctor home visits, home nursing, physiotherapy, lab tests and scans at home, plus elderly, post-operative, and chronic-disease care — with licensed clinicians and prices shown before the visit.';

  const itemList = servicesItemListSchema(locale, services);
  const faq = faqPageSchema(servicesFaqs[locale]);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/services`,
    name: site.labels.services[locale],
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="services-itemlist-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(itemList) }} />
      <Script id="services-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="services-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="services-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: site.labels.services[locale], active: true },
        ]}
        title={site.labels.services[locale]}
      />

      <main id="main-content">
        <section className="py-5">
          <div className="container">
            <h1 className="h2 mb-3">
              {isAr ? 'خدمات الرعاية الصحية المنزلية في مصر' : 'Home Healthcare Services in Egypt'}
            </h1>
            <p className="lead mb-0">{heroLead}</p>
          </div>
        </section>

        <section className="pb-2">
          <div className="container">
            <div className="row g-4">
              {landings.map((s) => (
                <div key={s.slug} className="col-12 col-md-6 col-lg-4">
                  <Link
                    href={`/${locale}/services/${s.slug}`}
                    className="card h-100 border-0 shadow-sm text-decoration-none"
                  >
                    <div className="card-body">
                      <h2 className="h5 mb-2 text-body">{s.headline}</h2>
                      <p className="text-muted mb-0">{s.description}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FaqSection
          heading={isAr ? 'الأسئلة الشائعة عن الخدمات المنزلية' : 'Home healthcare services FAQ'}
          faqs={servicesFaqs[locale]}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/specialties`, label: isAr ? 'التخصصات الطبية' : 'Medical specialties' },
          { href: `/${locale}/doctors`, label: isAr ? 'تصفّح الأطباء' : 'Browse doctors' },
          { href: `/${locale}/coverage`, label: isAr ? 'مناطق التغطية' : 'Coverage areas' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
