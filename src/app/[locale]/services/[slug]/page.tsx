import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import { config } from '@/lib/config';
import { generatePageMetadata } from '@/lib/utils/metadata';
import { generateBreadcrumbSchema, generateDoctorsCollectionSchema, renderJsonLd } from '@/lib/utils/structured-data';
import { getAllServiceLandingSlugs, getServiceLanding, getServiceLandingDoctors } from '@/lib/seo/search-discovery';
import styles from '../../seo-landing.module.scss';

interface ServiceLandingPageProps {
  params: Promise<{ locale: 'en' | 'ar'; slug: string }>;
}

export function generateStaticParams() {
  const locales = config.locales.supported as Array<'en' | 'ar'>;
  const slugs = getAllServiceLandingSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: ServiceLandingPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const content = getServiceLanding(locale, slug);

  if (!content) {
    return { robots: { index: false, follow: true }, title: 'Not Found' };
  }

  return generatePageMetadata({
    locale,
    path: `/${locale}/services/${slug}`,
    title: content.title,
    description: content.description,
    keywords: content.keywords,
  });
}

export default async function ServiceLandingPage({ params }: ServiceLandingPageProps) {
  const { locale, slug } = await params;
  const baseUrl = config.api.baseUrl;
  const content = getServiceLanding(locale, slug);

  if (!content) {
    notFound();
  }

  const doctors = await getServiceLandingDoctors(locale, slug);

  const breadcrumbItems = [
    { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: locale === 'ar' ? 'الخدمات' : 'Services', href: `/${locale}/services` },
    { label: content.headline, active: true },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: locale === 'ar' ? 'الرئيسية' : 'Home', url: `${baseUrl}/${locale}` },
    { name: locale === 'ar' ? 'الخدمات' : 'Services', url: `${baseUrl}/${locale}/services` },
    { name: content.headline, url: `${baseUrl}/${locale}/services/${slug}` },
  ]);

  const doctorsSchema = generateDoctorsCollectionSchema(doctors, locale, 1);

  return (
    <>
      <Script
        id="service-landing-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <Script
        id="service-landing-doctors-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(doctorsSchema) }}
      />
      <Header />
      <Breadcrumb items={breadcrumbItems} title={content.headline} />
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroCard}>
            <span className={styles.eyebrow}>{locale === 'ar' ? 'صفحة بحث عالية النية' : 'High-intent landing page'}</span>
            <h1 className={styles.title}>{content.headline}</h1>
            <p className={styles.description}>{content.description}</p>
            <div className={styles.actions}>
              <Link href={`/${locale}/booking`} className="btn btn-primary">
                {locale === 'ar' ? 'اطلب الخدمة' : 'Request service'}
              </Link>
              <Link href={`/${locale}/doctors`} className="btn btn-outline-primary">
                {locale === 'ar' ? 'تصفح الأطباء' : 'Browse doctors'}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{locale === 'ar' ? 'أطباء مناسبون لهذه الخدمة' : 'Doctors matching this service'}</h2>
          <div className={styles.grid}>
            {doctors.map((doctor) => (
              <article key={doctor.id} className={styles.card}>
                <div className={styles.meta}>{doctor.speciality}</div>
                <h2 className={styles.cardTitle}>{doctor.doctorName}</h2>
                <p className={styles.copy}>{doctor.bio}</p>
                <div className={styles.actions}>
                  <Link href={`/${locale}/doctors/${doctor.slug}`} className="btn btn-primary">
                    {locale === 'ar' ? 'صفحة الطبيب' : 'Doctor page'}
                  </Link>
                  <Link href={`/${locale}/booking`} className="btn btn-outline-primary">
                    {locale === 'ar' ? 'احجز الآن' : 'Book now'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <RelatedLinks
        locale={locale}
        title={locale === 'ar' ? 'روابط مفيدة لهذه الخدمة' : 'Useful links for this service'}
        links={[
          { href: `/${locale}/services`, label: locale === 'ar' ? 'جميع الخدمات' : 'All services' },
          { href: `/${locale}/specialties`, label: locale === 'ar' ? 'جميع التخصصات' : 'All specialties' },
          { href: `/${locale}/doctors`, label: locale === 'ar' ? 'تصفح الأطباء' : 'Browse doctors' },
          { href: `/${locale}/coverage`, label: locale === 'ar' ? 'تحقق من التغطية' : 'Check coverage' },
          { href: `/${locale}/booking`, label: locale === 'ar' ? 'ابدأ الحجز' : 'Start booking' },
        ]}
      />
      <Footer />
    </>
  );
}

export const dynamicParams = false;
