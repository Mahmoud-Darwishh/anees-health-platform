/**
 * Dynamic Doctor Profile Page
 * Server-rendered, SEO-optimized, bilingual
 * Beautiful, production-grade UI
 * 
 * Route: /[locale]/doctors/[slug]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDoctorBySlug, getAllDoctorSlugs, extractCity } from '@/lib/api/doctors';
import {
  generatePhysicianSchema,
  generateBreadcrumbSchema,
  renderJsonLd,
} from '@/lib/utils/structured-data';
import { generateDoctorProfileMetadata } from '@/lib/utils/metadata';
import { config } from '@/lib/config';
import DoctorProfileContent from '@/components/doctors/profile/DoctorProfileContent';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface DoctorProfilePageProps {
  params: Promise<{
    locale: 'en' | 'ar';
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = await getAllDoctorSlugs();
  const locales = config.locales.supported as ('en' | 'ar')[];

  return locales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: DoctorProfilePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const doctor = await getDoctorBySlug(slug, locale as 'en' | 'ar');

  if (!doctor) {
    return {
      title: locale === 'ar' ? 'الطبيب غير موجود' : 'Doctor Not Found',
      description:
        locale === 'ar'
          ? 'الطبيب الذي تبحث عنه غير موجود. تأكد من صحة الرابط أو ابحث عن طبيب آخر.'
          : 'The doctor you are looking for was not found. Please check the URL or browse other doctors.',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return generateDoctorProfileMetadata(doctor, locale, slug);
}

export default async function DoctorProfilePage({
  params,
}: DoctorProfilePageProps) {
  const { locale, slug } = await params;
  const doctor = await getDoctorBySlug(slug, locale as 'en' | 'ar');

  if (!doctor) {
    notFound();
  }

  const baseUrl = config.api.baseUrl;
  const canonicalUrl = `${baseUrl}/${locale}/doctors/${slug}`;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // Breadcrumb items for navigation
  const breadcrumbItems = [
    {
      label: locale === 'ar' ? 'الرئيسية' : 'Home',
      href: `/${locale}`,
    },
    {
      label: locale === 'ar' ? 'الأطباء' : 'Doctors',
      href: `/${locale}/doctors`,
    },
    {
      label: doctor.doctorName,
      active: true,
    },
  ];

  // Structured data schemas
  const physicianSchema = generatePhysicianSchema(doctor, locale as 'en' | 'ar', canonicalUrl);
  
  const breadcrumbSchema = generateBreadcrumbSchema(
    [
      { name: locale === 'ar' ? 'الرئيسية' : 'Home', url: `${baseUrl}/${locale}` },
      { name: locale === 'ar' ? 'الأطباء' : 'Doctors', url: `${baseUrl}/${locale}/doctors` },
      { name: doctor.doctorName, url: canonicalUrl },
    ]
  );

  return (
    <>
      {/* Structured Data - Physician Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(physicianSchema) }}
      />
      {/* Structured Data - Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      
      <Header />
      <Breadcrumb items={breadcrumbItems} title={doctor.doctorName} />
      <article dir={dir} className="doctor-profile-page">
        <DoctorProfileContent doctor={doctor} locale={locale} />
      </article>
      <Footer />
    </>
  );
}

export const revalidate = 3600;
