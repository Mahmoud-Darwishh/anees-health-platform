import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { config } from '@/lib/config';
import { generatePageMetadata } from '@/lib/utils/metadata';
import { generateBreadcrumbSchema, renderJsonLd } from '@/lib/utils/structured-data';
import { getAllSpecialtyLandings } from '@/lib/seo/search-discovery';
import styles from '../seo-landing.module.scss';

interface SpecialtiesIndexPageProps {
  params: Promise<{ locale: 'en' | 'ar' }>;
}

export async function generateMetadata({ params }: SpecialtiesIndexPageProps): Promise<Metadata> {
  const { locale } = await params;

  return generatePageMetadata({
    locale,
    path: `/${locale}/specialties`,
    title: locale === 'ar' ? 'تخصصات الأطباء | أنيس' : 'Doctor Specialties | Anees',
    description:
      locale === 'ar'
        ? 'اكتشف تخصصات الأطباء على أنيس مثل القلب والباطنة والعلاج الطبيعي وطب الشيخوخة مع صفحات قابلة للفهرسة لكل تخصص.'
        : 'Explore indexed doctor specialty pages on Anees including cardiology, internal medicine, physiotherapy, geriatrics, and more.',
    keywords:
      locale === 'ar'
        ? 'أنيس تخصصات الأطباء، قلب، باطنة، علاج طبيعي، طب الشيخوخة، طبيب منزلي، صفحات تخصصات الأطباء'
        : 'Anees doctor specialties, cardiology, internal medicine, physiotherapy, geriatrics, home visit specialties, indexed specialty pages',
  });
}

export default async function SpecialtiesIndexPage({ params }: SpecialtiesIndexPageProps) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;
  const specialties = await getAllSpecialtyLandings(locale);

  const breadcrumbItems = [
    { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: locale === 'ar' ? 'التخصصات' : 'Specialties', active: true },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: locale === 'ar' ? 'الرئيسية' : 'Home', url: `${baseUrl}/${locale}` },
    { name: locale === 'ar' ? 'التخصصات' : 'Specialties', url: `${baseUrl}/${locale}/specialties` },
  ]);

  return (
    <>
      <Script
        id="specialties-index-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <Header />
      <Breadcrumb
        items={breadcrumbItems}
        title={locale === 'ar' ? 'تخصصات الأطباء' : 'Doctor Specialties'}
      />
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroCard}>
            <span className={styles.eyebrow}>
              {locale === 'ar' ? 'هيكل SEO للتخصصات' : 'SEO Specialty Structure'}
            </span>
            <h1 className={styles.title}>
              {locale === 'ar' ? 'صفحات تخصصات قابلة للفهرسة لكل تخصص' : 'Indexable specialty pages for every doctor specialty'}
            </h1>
            <p className={styles.description}>
              {locale === 'ar'
                ? 'هذه الصفحات تساعد محركات البحث على فهم تخصصات أنيس وربط كل تخصص بالأطباء المتاحين وصفحاتهم الشخصية.'
                : 'These pages help search engines understand Anees specialty coverage and connect each specialty with the matching doctor profiles.'}
            </p>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <div className="container">
          <div className={styles.grid}>
            {specialties.map((specialty) => (
              <article key={specialty.slug} className={styles.card}>
                <div className={styles.meta}>
                  {specialty.doctorCount} {locale === 'ar' ? 'طبيب/أخصائي' : 'doctors'}
                </div>
                <h2 className={styles.cardTitle}>{specialty.name}</h2>
                <p className={styles.copy}>{specialty.description}</p>
                <div className={styles.actions}>
                  <Link href={`/${locale}/specialties/${specialty.slug}`} className="btn btn-primary">
                    {locale === 'ar' ? 'عرض التخصص' : 'View specialty'}
                  </Link>
                  <Link href={`/${locale}/doctors`} className="btn btn-outline-primary">
                    {locale === 'ar' ? 'كل الأطباء' : 'All doctors'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
