/**
 * Dynamic Doctor Profile Page
 * Server-rendered, SEO-optimized, bilingual
 * Beautiful, production-grade UI
 * 
 * Route: /[locale]/doctors/[slug]
 */

import { Metadata } from 'next';
import Script from 'next/script';
import { notFound, permanentRedirect } from 'next/navigation';
import { getDoctorBySlug, getAllDoctorSlugs, getDoctorCanonicalSlugById } from '@/lib/api/doctors';
import {
  physicianSchema as physicianJsonLd,
  breadcrumbSchema,
  faqPageSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { buildDoctorProfileMetadata } from '@/lib/seo/metadata';
import { doctorFaqs } from '@/lib/seo/faqs';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { config } from '@/lib/config';
import DoctorProfileContent from '@/features/doctors/components/profile/DoctorProfileContent';
// Route-scoped styles — only the doctor profile page ships this CSS.
import '@/assets/scss/pages/doctor-profile.scss';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';

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

  const canonicalSlug = await getDoctorCanonicalSlugById(Number(doctor.id));
  return buildDoctorProfileMetadata({
    locale,
    slug: canonicalSlug || slug,
    name: doctor.doctorName,
    speciality: doctor.speciality,
    bio: doctor.bio,
    image: doctor.image,
  });
}

export default async function DoctorProfilePage({
  params,
}: DoctorProfilePageProps) {
  const { locale, slug } = await params;
  const doctor = await getDoctorBySlug(slug, locale as 'en' | 'ar');

  if (!doctor) {
    notFound();
  }

  const canonicalSlug = await getDoctorCanonicalSlugById(Number(doctor.id));
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/${locale}/doctors/${canonicalSlug}`);
  }

  const baseUrl = config.api.baseUrl;
  const finalSlug = canonicalSlug || slug;
  const canonicalUrl = `${baseUrl}/${locale}/doctors/${finalSlug}`;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const seoLocale: SupportedLocale = locale === 'ar' ? 'ar' : 'en';

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
  const physicianLd = physicianJsonLd(seoLocale, doctor, finalSlug);
  const crumbsLd = breadcrumbSchema([
    { name: site.labels.home[seoLocale], url: `${baseUrl}/${locale}` },
    { name: site.labels.doctors[seoLocale], url: `${baseUrl}/${locale}/doctors` },
    { name: doctor.doctorName, url: canonicalUrl },
  ]);
  const faqLd = faqPageSchema(
    doctorFaqs(seoLocale, { name: doctor.doctorName, speciality: doctor.speciality })
  );

  return (
    <>
      <Script
        id="doctor-physician-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(physicianLd) }}
      />
      <Script
        id="doctor-breadcrumb-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
      />
      <Script
        id="doctor-faq-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(faqLd) }}
      />
      
      <Header />
      <Breadcrumb items={breadcrumbItems} title={doctor.doctorName} />
      <article dir={dir} className="doctor-profile-page">
        <DoctorProfileContent doctor={doctor} locale={locale} />
      </article>
      <RelatedLinks
        locale={locale}
        title={locale === 'ar' ? 'روابط مرتبطة بالطبيب' : 'Links related to this doctor'}
        links={[
          { href: `/${locale}/booking`, label: locale === 'ar' ? 'احجز مع الطبيب الآن' : 'Book this doctor now' },
          { href: `/${locale}/doctors`, label: locale === 'ar' ? 'كل الأطباء' : 'All doctors' },
          {
            href: `/${locale}/doctors?search=${encodeURIComponent(doctor.speciality)}`,
            label: locale === 'ar' ? 'أطباء بنفس التخصص' : 'Doctors in the same specialty',
          },
          { href: `/${locale}/specialties`, label: locale === 'ar' ? 'استكشف التخصصات الطبية' : 'Explore medical specialties' },
          { href: `/${locale}/services`, label: locale === 'ar' ? 'الخدمات الطبية المتاحة' : 'Available medical services' },
          { href: `/${locale}/coverage`, label: locale === 'ar' ? 'تحقق من نطاق التغطية' : 'Check coverage area' },
        ]}
      />
      <Footer />
    </>
  );
}

export const revalidate = 3600;
