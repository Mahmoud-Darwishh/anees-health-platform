import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import { config } from '@/lib/config';
import { buildSpecialtyMetadata } from '@/lib/seo/metadata';
import {
  breadcrumbSchema,
  physiciansItemListSchema,
  medicalSpecialtySchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { site } from '@/lib/seo/site';
import { getAllSpecialtyLandings, getSpecialtyDoctors } from '@/lib/seo/search-discovery';
import styles from '../../seo-landing.module.scss';

interface SpecialtyPageProps {
  params: Promise<{ locale: 'en' | 'ar'; slug: string }>;
}

export async function generateStaticParams() {
  const locales = config.locales.supported as Array<'en' | 'ar'>;
  const pages = await Promise.all(
    locales.map(async (locale) => {
      const specialties = await getAllSpecialtyLandings(locale);
      return specialties.map((specialty) => ({ locale, slug: specialty.slug }));
    })
  );

  return pages.flat();
}

export async function generateMetadata({ params }: SpecialtyPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getSpecialtyDoctors(locale, slug);

  if (!data) {
    return { robots: { index: false, follow: true }, title: 'Not Found' };
  }

  return buildSpecialtyMetadata({
    locale,
    slug,
    name: data.specialtyName,
    description:
      locale === 'ar'
        ? `تصفح أطباء ${data.specialtyName} على أنيس واحجز زيارة منزلية أو استشارة طبية.`
        : `Browse ${data.specialtyName} doctors on Anees and book a home visit or consultation in Egypt.`,
  });
}

export default async function SpecialtyPage({ params }: SpecialtyPageProps) {
  const { locale, slug } = await params;
  const baseUrl = config.api.baseUrl;
  const data = await getSpecialtyDoctors(locale, slug);

  if (!data) {
    notFound();
  }

  const breadcrumbItems = [
    { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: locale === 'ar' ? 'التخصصات' : 'Specialties', href: `/${locale}/specialties` },
    { label: data.specialtyName, active: true },
  ];

  const crumbsLd = breadcrumbSchema([
    { name: site.labels.home[locale], url: `${baseUrl}/${locale}` },
    { name: site.labels.specialties[locale], url: `${baseUrl}/${locale}/specialties` },
    { name: data.specialtyName, url: `${baseUrl}/${locale}/specialties/${slug}` },
  ]);

  const specialtyLd = medicalSpecialtySchema({
    locale,
    slug,
    name: data.specialtyName,
    description:
      locale === 'ar'
        ? `تخصص ${data.specialtyName} على أنيس هيلث في مصر.`
        : `${data.specialtyName} on Anees Health in Egypt.`,
  });

  const doctorsLd = physiciansItemListSchema(locale, data.doctors, (d) => d.slug);

  return (
    <>
      <Script
        id="specialty-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
      />
      <Script
        id="specialty-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(specialtyLd) }}
      />
      <Script
        id="specialty-doctors-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(doctorsLd) }}
      />
      <Header />
      <Breadcrumb items={breadcrumbItems} title={data.specialtyName} />
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroCard}>
            <span className={styles.eyebrow}>{locale === 'ar' ? 'تخصص طبي' : 'Medical specialty'}</span>
            <h1 className={styles.title}>{data.specialtyName}</h1>
            <p className={styles.description}>
              {locale === 'ar'
                ? `يعرض أنيس في هذه الصفحة الأطباء المتخصصين في ${data.specialtyName} مع روابط مباشرة لصفحات الأطباء الشخصية.`
                : `Anees lists its ${data.specialtyName} doctors here with direct links to each doctor profile page.`}
            </p>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <div className="container">
          <div className={styles.grid}>
            {data.doctors.map((doctor) => (
              <article key={doctor.id} className={styles.card}>
                <div className={styles.meta}>{doctor.professionalTitle}</div>
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
        title={locale === 'ar' ? 'روابط مرتبطة بهذا التخصص' : 'Links related to this specialty'}
        links={[
          { href: `/${locale}/specialties`, label: locale === 'ar' ? 'كل التخصصات' : 'All specialties' },
          { href: `/${locale}/doctors?search=${encodeURIComponent(data.specialtyName)}`, label: locale === 'ar' ? 'أطباء هذا التخصص' : 'Doctors in this specialty' },
          { href: `/${locale}/services`, label: locale === 'ar' ? 'الخدمات المرتبطة' : 'Related services' },
          { href: `/${locale}/coverage`, label: locale === 'ar' ? 'المناطق المغطاة' : 'Covered areas' },
          { href: `/${locale}/booking`, label: locale === 'ar' ? 'احجز الآن' : 'Book now' },
        ]}
      />
      <Footer />
    </>
  );
}

export const dynamicParams = false;
