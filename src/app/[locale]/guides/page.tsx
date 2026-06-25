/**
 * Guides hub — /[locale]/guides
 *
 * Lists the editorial guides (comparison / how-to / pillar) that build topical
 * authority and feed AI answer engines.
 */
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import { buildGuidesMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllGuides } from '@/lib/seo/guides';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildGuidesMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const guides = getAllGuides(locale);
  const guidesLabel = isAr ? 'الأدلة' : 'Guides';
  const heroLead = isAr
    ? 'أدلة عملية تساعد الأسر المصرية على اتخاذ قرارات الرعاية المنزلية بثقة — كيف تختار مزوّداً، والمقارنة بين الخيارات، وما تتوقعه.'
    : 'Practical guides to help Egyptian families make home-care decisions with confidence — how to choose a provider, how the options compare, and what to expect.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: guidesLabel, url: `${site.baseUrl}/${locale}/guides` },
  ];
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/guides`,
    name: guidesLabel,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="guides-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="guides-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: guidesLabel, active: true },
        ]}
        title={guidesLabel}
      />

      <main id="main-content">
        <section className="py-5">
          <div className="container">
            <h1 className="h2 mb-3">{isAr ? 'أدلة الرعاية الصحية المنزلية' : 'Home Healthcare Guides'}</h1>
            <p className="lead mb-0">{heroLead}</p>
          </div>
        </section>

        <section className="pb-5">
          <div className="container">
            <div className="row g-4">
              {guides.map((g) => (
                <div key={g.slug} className="col-12 col-md-6">
                  <Link
                    href={`/${locale}/guides/${g.slug}`}
                    className="card h-100 border-0 shadow-sm text-decoration-none"
                  >
                    <div className="card-body">
                      <h2 className="h5 mb-2 text-body">{g.title}</h2>
                      <p className="text-muted mb-0">{g.description}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/areas`, label: isAr ? 'مناطق التغطية' : 'Coverage areas' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
