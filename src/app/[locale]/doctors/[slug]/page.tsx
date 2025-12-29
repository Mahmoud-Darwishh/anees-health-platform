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
import { generatePhysicianSchema, renderJsonLd } from '@/lib/utils/structured-data';
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
        googleBot: {
          index: false,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  }

  const baseUrl = config.api.baseUrl;
  const canonicalUrl = `${baseUrl}/${locale}/doctors/${slug}`;
  const city = extractCity(doctor.location);

  const title = locale === 'ar'
    ? `${doctor.doctorName} - ${doctor.speciality} في ${city}`
    : `${doctor.doctorName} - ${doctor.speciality} in ${city}`;

  const description = locale === 'ar'
    ? `احجز موعد مع ${doctor.doctorName}، ${doctor.professionalTitle}. ${doctor.experienceYears}+ سنوات خبرة. متاح عبر ${doctor.channels.join('، ')}.`
    : `Book an appointment with ${doctor.doctorName}, ${doctor.professionalTitle}. ${doctor.experienceYears}+ years experience. Available via ${doctor.channels.join(', ')}.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${baseUrl}/en/doctors/${slug}`,
        'ar': `${baseUrl}/ar/doctors/${slug}`,
        'x-default': `${baseUrl}/en/doctors/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: locale === 'ar' ? 'أنيس' : 'Anees',
      locale: locale === 'ar' ? 'ar_EG' : 'en_EG',
      type: 'profile',
      images: [
        {
          url: doctor.image.startsWith('http')
            ? doctor.image
            : `${baseUrl}/${doctor.image}`,
          width: 800,
          height: 600,
          alt: doctor.doctorName,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
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
  const physicianSchema = generatePhysicianSchema(doctor, locale as 'en' | 'ar', canonicalUrl);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // Breadcrumb items
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(physicianSchema) }}
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
