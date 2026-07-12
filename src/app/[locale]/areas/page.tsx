/**
 * Areas hub — /[locale]/areas
 *
 * Indexes the Greater-Cairo neighbourhoods Anees serves and links down to each
 * local landing page, capturing high-intent "near me" / neighbourhood queries.
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import ContentHero from '@/components/common/content/ContentHero';
import ContentCard from '@/components/common/content/ContentCard';
import { buildAreasMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllAreas } from '@/lib/seo/areas';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildAreasMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function AreasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const areas = getAllAreas(locale);
  const byGovernorate = areas.reduce<Record<string, typeof areas>>((acc, a) => {
    (acc[a.governorate] ||= []).push(a);
    return acc;
  }, {});

  const areasLabel = isAr ? 'مناطق التغطية' : 'Coverage areas';
  const heroLead = isAr
    ? 'تخدم أنيس هيلث القاهرة الكبرى بزيارات منزلية لأطباء وممرضين وأخصائيي علاج طبيعي وتحاليل في المنزل. اختر منطقتك لمعرفة الخدمات المتاحة، أو تحقّق من عنوانك على خريطة التغطية.'
    : 'Anees Health serves Greater Cairo with doctor, nursing, physiotherapy, and at-home lab visits. Pick your area to see the services available, or verify your exact address on the coverage map.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: areasLabel, url: `${site.baseUrl}/${locale}/areas` },
  ];
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/areas`,
    name: areasLabel,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="areas-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="areas-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: areasLabel, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={areasLabel}
          title={isAr ? 'مناطق الرعاية الصحية المنزلية في القاهرة الكبرى' : 'Home Healthcare Areas in Greater Cairo'}
          lead={heroLead}
        />

        <section className="py-5">
          <div className="container">
            {Object.entries(byGovernorate).map(([gov, list]) => (
              <div key={gov} className="mb-5">
                <h2 className="h5 mb-3">{gov}</h2>
                <div className="row g-3">
                  {list.map((a) => (
                    <div key={a.slug} className="col-12 col-sm-6 col-lg-4">
                      <ContentCard
                        href={`/${locale}/areas/${a.slug}`}
                        icon="fa-location-dot"
                        title={a.name}
                        cta={isAr ? 'الخدمات المنزلية' : 'Home services'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/coverage`, label: isAr ? 'خريطة التغطية' : 'Coverage map' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/doctors`, label: isAr ? 'تصفّح الأطباء' : 'Browse doctors' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
