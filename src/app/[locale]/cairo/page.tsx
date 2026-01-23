import { Metadata } from 'next';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import CityPageContent from '@/components/sections/city/CityPageContent';
import { generateBreadcrumbSchema, renderJsonLd } from '@/lib/utils/structured-data';
import { config } from '@/lib/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale === 'ar';

  return {
    title: isArabic
      ? 'أنيس هيلث القاهرة - رعاية صحية منزلية في القاهرة | طبيب منزلي'
      : 'Anees Health Cairo - Home Healthcare in Cairo | Doctor Home Visits',
    description: isArabic
      ? 'خدمات رعاية صحية منزلية في القاهرة: زيارات طبيب منزلي، تمريض منزلي، علاج طبيعي، تحاليل منزلية في الزمالك، المعادي، مدينة نصر، هليوبوليس وجميع أحياء القاهرة'
      : 'Home healthcare services in Cairo: doctor home visits, home nursing, physiotherapy, lab tests at home in Zamalek, Maadi, Nasr City, Heliopolis and all Cairo neighborhoods',
    keywords: isArabic
      ? 'أنيس القاهرة، طبيب منزلي القاهرة، رعاية صحية منزلية القاهرة، تمريض منزلي القاهرة، علاج طبيعي منزلي القاهرة، الزمالك، المعادي، مدينة نصر، هليوبوليس، التجمع الخامس، 6 أكتوبر'
      : 'Anees Cairo, doctor home visit Cairo, home healthcare Cairo, home nursing Cairo, physiotherapy Cairo, Zamalek, Maadi, Nasr City, Heliopolis, New Cairo, 5th Settlement, 6th October',
    openGraph: {
      title: isArabic
        ? 'أنيس هيلث القاهرة - رعاية صحية منزلية'
        : 'Anees Health Cairo - Home Healthcare',
      description: isArabic
        ? 'خدمات رعاية صحية منزلية احترافية في جميع أنحاء القاهرة'
        : 'Professional home healthcare services across all Cairo',
      url: `${config.api.baseUrl}/${locale}/cairo`,
    },
    alternates: {
      canonical: `${config.api.baseUrl}/${locale}/cairo`,
      languages: {
        'en-US': `${config.api.baseUrl}/en/cairo`,
        'ar-EG': `${config.api.baseUrl}/ar/cairo`,
      },
    },
  };
}

export default async function CairoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;
  const isArabic = locale === 'ar';

  const cairoData = {
    name: 'Cairo',
    nameAr: 'القاهرة',
    heroImage: '/assets/img/banner/banner-img-14.jpg',
    description:
      'Professional home healthcare services across Cairo. Our team of qualified doctors, nurses, and therapists bring medical care directly to your home.',
    descriptionAr:
      'خدمات رعاية صحية منزلية احترافية في جميع أنحاء القاهرة. فريقنا من الأطباء والممرضين والمعالجين المؤهلين يقدمون الرعاية الطبية مباشرة إلى منزلك.',
    stats: {
      doctors: 85,
      patients: 12000,
      neighborhoods: 45,
    },
    neighborhoods: [
      { name: 'Zamalek', nameAr: 'الزمالك' },
      { name: 'Maadi', nameAr: 'المعادي' },
      { name: 'Nasr City', nameAr: 'مدينة نصر' },
      { name: 'Heliopolis', nameAr: 'مصر الجديدة' },
      { name: 'New Cairo', nameAr: 'القاهرة الجديدة' },
      { name: '5th Settlement', nameAr: 'التجمع الخامس' },
      { name: 'Rehab City', nameAr: 'مدينة الرحاب' },
      { name: 'Tagamoa', nameAr: 'التجمع' },
      { name: 'Mokattam', nameAr: 'المقطم' },
      { name: 'Downtown Cairo', nameAr: 'وسط البلد' },
      { name: 'Garden City', nameAr: 'جاردن سيتي' },
      { name: 'Dokki', nameAr: 'الدقي' },
      { name: 'Mohandessin', nameAr: 'المهندسين' },
      { name: 'Agouza', nameAr: 'العجوزة' },
    ],
  };

  const breadcrumbs = [
    {
      name: isArabic ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${locale}`,
    },
    {
      name: isArabic ? 'القاهرة' : 'Cairo',
      url: `${baseUrl}/${locale}/cairo`,
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  const breadcrumbItems = [
    { label: isArabic ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: isArabic ? 'القاهرة' : 'Cairo', active: true },
  ];

  return (
    <>
      <Header />
      
      {/* Breadcrumb Schema */}
      <Script
        id="cairo-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />

      <Breadcrumb items={breadcrumbItems} />
      
      <CityPageContent cityData={cairoData} locale={locale} />
      
      <Footer />
    </>
  );
}
