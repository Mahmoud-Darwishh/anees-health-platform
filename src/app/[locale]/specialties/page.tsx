/**
 * Specialties hub — /[locale]/specialties
 *
 * Indexes every medical specialty available for home visits (dynamic from the
 * doctor roster via `getAllSpecialtyLandings`) and links down to per-specialty
 * pages, spreading internal-link equity to doctor profiles.
 */
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import { buildSpecialtiesMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllSpecialtyLandings } from '@/lib/seo/search-discovery';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildSpecialtiesMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function SpecialtiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const specialties = await getAllSpecialtyLandings(locale);

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.specialties[locale], url: `${site.baseUrl}/${locale}/specialties` },
  ];

  const heroLead = isAr
    ? 'تصفّح التخصصات الطبية المتاحة للزيارات المنزلية والاستشارات عبر أنيس هيلث في القاهرة الكبرى، واحجز مع طبيب مرخّص في التخصص المناسب لحالتك.'
    : 'Browse the medical specialties available for home visits and consultations through Anees Health across Greater Cairo, and book a licensed doctor in the specialty your case needs.';

  const webpage = webPageSchema({
    locale,
    path: `/${locale}/specialties`,
    name: site.labels.specialties[locale],
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="specialties-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="specialties-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: site.labels.specialties[locale], active: true },
        ]}
        title={site.labels.specialties[locale]}
      />

      <main id="main-content">
        <section className="py-5">
          <div className="container">
            <h1 className="h2 mb-3">
              {isAr ? 'التخصصات الطبية للزيارات المنزلية' : 'Medical Specialties for Home Visits'}
            </h1>
            <p className="lead mb-0">{heroLead}</p>
          </div>
        </section>

        <section className="pb-5">
          <div className="container">
            <div className="row g-4">
              {specialties.map((s) => (
                <div key={s.slug} className="col-12 col-md-6 col-lg-4">
                  <Link
                    href={`/${locale}/specialties/${s.slug}`}
                    className="card h-100 border-0 shadow-sm text-decoration-none"
                  >
                    <div className="card-body d-flex justify-content-between align-items-center gap-2">
                      <h2 className="h6 mb-0 text-body">{s.name}</h2>
                      <span className="badge bg-light text-muted">
                        {s.doctorCount}{' '}
                        {isAr ? 'طبيب' : s.doctorCount === 1 ? 'doctor' : 'doctors'}
                      </span>
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
          { href: `/${locale}/doctors`, label: isAr ? 'تصفّح الأطباء' : 'Browse doctors' },
          { href: `/${locale}/coverage`, label: isAr ? 'مناطق التغطية' : 'Coverage areas' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
