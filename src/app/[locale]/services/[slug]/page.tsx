/**
 * Service landing — /[locale]/services/[slug]
 *
 * One page per home-healthcare service (doctor-at-home, physiotherapy-at-home,
 * elderly-care-at-home). Pulls bilingual copy + matching doctors from
 * `@/lib/seo/search-discovery` and emits MedicalProcedure + Physician ItemList
 * + HowTo + FAQ + WebPage + Breadcrumb JSON-LD via the existing builders.
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import ContentHero from '@/components/common/content/ContentHero';
import DoctorMiniGrid from '@/features/doctors/components/DoctorMiniGrid';
import { buildServiceLandingMetadata } from '@/lib/seo/metadata';
import {
  medicalProcedureSchema,
  physiciansItemListSchema,
  faqPageSchema,
  howToBookingSchema,
  webPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { servicesFaqs } from '@/lib/seo/faqs';
import {
  getServiceLanding,
  getServiceAnswer,
  getAllServiceLandingSlugs,
  getServiceLandingDoctors,
} from '@/lib/seo/search-discovery';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = getAllServiceLandingSlugs();
  const locales = config.locales.supported as ('en' | 'ar')[];
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const landing = getServiceLanding(locale, slug);
  if (!landing) {
    return {
      title: locale === 'ar' ? 'الخدمة غير موجودة' : 'Service not found',
      robots: { index: false, follow: true },
    };
  }
  return buildServiceLandingMetadata({
    locale,
    slug,
    title: landing.title,
    description: landing.description,
  });
}

const BOOKING_STEPS: Record<SupportedLocale, string[]> = {
  en: [
    'Choose the home service you need.',
    'Pick a date and time that suits you.',
    'Enter the patient address and contact details.',
    'Confirm — pay online via Kashier or pay the clinician on arrival.',
    'An Anees coordinator confirms the slot and assigns the right clinician.',
  ],
  ar: [
    'اختر الخدمة المنزلية التي تحتاجها.',
    'حدّد التاريخ والوقت المناسبين لك.',
    'أدخل عنوان المريض وبيانات التواصل.',
    'أكّد الحجز — ادفع إلكترونياً عبر كاشير أو ادفع للكادر عند الوصول.',
    'يؤكّد منسق أنيس الموعد ويعيّن الكادر الطبي المناسب.',
  ],
};

export default async function ServiceLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const landing = getServiceLanding(locale, slug);
  if (!landing) notFound();

  const answer = getServiceAnswer(locale, slug);
  const doctors = await getServiceLandingDoctors(locale, slug);

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.services[locale], url: `${site.baseUrl}/${locale}/services` },
    { name: landing.headline, url: `${site.baseUrl}/${locale}/services/${slug}` },
  ];

  const procedure = medicalProcedureSchema({
    locale,
    slug,
    name: landing.headline,
    description: landing.description,
  });
  const docList = physiciansItemListSchema(locale, doctors, (d) => d.slug);
  const faq = faqPageSchema(servicesFaqs[locale]);
  const howTo = howToBookingSchema(locale);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/services/${slug}`,
    name: landing.headline,
    description: landing.description,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="service-procedure-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(procedure) }} />
      <Script id="service-doctors-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(docList) }} />
      <Script id="service-howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(howTo) }} />
      <Script id="service-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="service-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="service-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: site.labels.services[locale], href: `/${locale}/services` },
          { label: landing.headline, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero title={landing.headline} lead={landing.description} />

        {answer ? (
          <section className="pt-5 pb-0">
            <div className="container">
              <p className="lead mb-0">{answer}</p>
            </div>
          </section>
        ) : null}

        <section className="pt-5 pb-2">
          <div className="container">
            <h2 className="h4 mb-3">{isAr ? 'كيف تحجز هذه الخدمة' : 'How to book this service'}</h2>
            <ol className="ps-3 mb-0">
              {BOOKING_STEPS[locale].map((step, i) => (
                <li key={i} className="mb-2">{step}</li>
              ))}
            </ol>
          </div>
        </section>

        <DoctorMiniGrid
          doctors={doctors}
          locale={locale}
          heading={isAr ? 'أطباء متاحون لهذه الخدمة' : 'Doctors available for this service'}
          emptyText={
            isAr
              ? 'سيتولّى منسق أنيس تعيين الكادر الطبي المناسب لحالتك.'
              : 'An Anees coordinator will assign the right clinician for your case.'
          }
        />

        <FaqSection
          heading={isAr ? 'الأسئلة الشائعة' : 'Frequently asked questions'}
          faqs={servicesFaqs[locale]}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/services`, label: isAr ? 'كل الخدمات' : 'All services' },
          { href: `/${locale}/specialties`, label: isAr ? 'التخصصات الطبية' : 'Medical specialties' },
          { href: `/${locale}/coverage`, label: isAr ? 'تحقّق من التغطية' : 'Check coverage' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز الآن' : 'Book now' },
        ]}
      />
      <Footer />
    </>
  );
}
