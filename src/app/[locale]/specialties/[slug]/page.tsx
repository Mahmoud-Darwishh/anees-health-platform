/**
 * Specialty landing — /[locale]/specialties/[slug]
 *
 * One page per specialty, listing the matching home-visit doctors. Emits
 * MedicalSpecialty + Physician ItemList + WebPage + Breadcrumb JSON-LD.
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import DoctorMiniGrid from '@/features/doctors/components/DoctorMiniGrid';
import { buildSpecialtyMetadata } from '@/lib/seo/metadata';
import {
  medicalSpecialtySchema,
  physiciansItemListSchema,
  webPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import {
  getAllSpecialtyLandings,
  getSpecialtyDoctors,
} from '@/lib/seo/search-discovery';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const specialties = await getAllSpecialtyLandings('en');
  const locales = config.locales.supported as ('en' | 'ar')[];
  return locales.flatMap((locale) =>
    specialties.map((s) => ({ locale, slug: s.slug }))
  );
}

function describe(locale: SupportedLocale, name: string): string {
  return locale === 'ar'
    ? `تصفّح أطباء ${name} على أنيس هيلث للزيارات المنزلية والاستشارات الطبية في القاهرة الكبرى، واحجز مع طبيب مرخّص.`
    : `Browse ${name} doctors on Anees Health for home visits and medical consultations across Greater Cairo, and book a licensed physician.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const result = await getSpecialtyDoctors(locale, slug);
  if (!result) {
    return {
      title: locale === 'ar' ? 'التخصص غير موجود' : 'Specialty not found',
      robots: { index: false, follow: true },
    };
  }
  return buildSpecialtyMetadata({
    locale,
    slug,
    name: result.specialtyName,
    description: describe(locale, result.specialtyName),
  });
}

export default async function SpecialtyLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const result = await getSpecialtyDoctors(locale, slug);
  if (!result) notFound();

  const { specialtyName, doctors } = result;
  const description = describe(locale, specialtyName);

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.specialties[locale], url: `${site.baseUrl}/${locale}/specialties` },
    { name: specialtyName, url: `${site.baseUrl}/${locale}/specialties/${slug}` },
  ];

  const specialtySchema = medicalSpecialtySchema({ locale, slug, name: specialtyName, description });
  const docList = physiciansItemListSchema(locale, doctors, (d) => d.slug);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/specialties/${slug}`,
    name: specialtyName,
    description,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="specialty-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(specialtySchema) }} />
      <Script id="specialty-doctors-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(docList) }} />
      <Script id="specialty-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="specialty-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: site.labels.specialties[locale], href: `/${locale}/specialties` },
          { label: specialtyName, active: true },
        ]}
        title={specialtyName}
      />

      <main id="main-content">
        <section className="py-5">
          <div className="container">
            <h1 className="h2 mb-3">
              {isAr ? `${specialtyName} — زيارات منزلية` : `${specialtyName} — Home Visits`}
            </h1>
            <p className="lead mb-0">{description}</p>
          </div>
        </section>

        <DoctorMiniGrid
          doctors={doctors}
          locale={locale}
          heading={isAr ? `أطباء ${specialtyName}` : `${specialtyName} doctors`}
          emptyText={
            isAr
              ? 'سيتولّى منسق أنيس تعيين الطبيب المناسب لحالتك.'
              : 'An Anees coordinator will assign the right doctor for your case.'
          }
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/specialties`, label: isAr ? 'كل التخصصات' : 'All specialties' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/coverage`, label: isAr ? 'تحقّق من التغطية' : 'Check coverage' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز الآن' : 'Book now' },
        ]}
      />
      <Footer />
    </>
  );
}
