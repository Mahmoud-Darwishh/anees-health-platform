import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { config } from '@/lib/config';
import { buildSpecialtiesMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { site } from '@/lib/seo/site';
import { getAllSpecialtyLandings } from '@/lib/seo/search-discovery';
import styles from '../seo-landing.module.scss';

interface SpecialtiesIndexPageProps {
  params: Promise<{ locale: 'en' | 'ar' }>;
}

export async function generateMetadata({ params }: SpecialtiesIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildSpecialtiesMetadata(locale);
}

export default async function SpecialtiesIndexPage({ params }: SpecialtiesIndexPageProps) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;
  const specialties = await getAllSpecialtyLandings(locale);

  const breadcrumbItems = [
    { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: locale === 'ar' ? 'التخصصات' : 'Specialties', active: true },
  ];

  const crumbsLd = breadcrumbSchema([
    { name: site.labels.home[locale], url: `${baseUrl}/${locale}` },
    { name: site.labels.specialties[locale], url: `${baseUrl}/${locale}/specialties` },
  ]);

  return (
    <>
      <Script
        id="specialties-index-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
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
