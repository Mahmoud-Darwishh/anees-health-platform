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
      ? 'أنيس هيلث الجيزة - رعاية صحية منزلية في الجيزة | طبيب منزلي'
      : 'Anees Health Giza - Home Healthcare in Giza | Doctor Home Visits',
    description: isArabic
      ? 'خدمات رعاية صحية منزلية في الجيزة: زيارات طبيب منزلي، تمريض منزلي، علاج طبيعي، تحاليل منزلية في 6 أكتوبر، الشيخ زايد، المهندسين، الدقي وجميع أحياء الجيزة'
      : 'Home healthcare services in Giza: doctor home visits, home nursing, physiotherapy, lab tests at home in 6th October, Sheikh Zayed, Mohandessin, Dokki and all Giza neighborhoods',
    keywords: isArabic
      ? 'أنيس الجيزة، طبيب منزلي الجيزة، رعاية صحية منزلية الجيزة، تمريض منزلي الجيزة، علاج طبيعي منزلي الجيزة، 6 أكتوبر، الشيخ زايد، المهندسين، الدقي، العجوزة، الهرم'
      : 'Anees Giza, doctor home visit Giza, home healthcare Giza, home nursing Giza, physiotherapy Giza, 6th October, Sheikh Zayed, Mohandessin, Dokki, Agouza, Haram',
    openGraph: {
      title: isArabic
        ? 'أنيس هيلث الجيزة - رعاية صحية منزلية'
        : 'Anees Health Giza - Home Healthcare',
      description: isArabic
        ? 'خدمات رعاية صحية منزلية احترافية في جميع أنحاء الجيزة'
        : 'Professional home healthcare services across all Giza',
      url: `${config.api.baseUrl}/${locale}/giza`,
    },
    alternates: {
      canonical: `${config.api.baseUrl}/${locale}/giza`,
      languages: {
        'en-US': `${config.api.baseUrl}/en/giza`,
        'ar-EG': `${config.api.baseUrl}/ar/giza`,
      },
    },
  };
}

export default async function GizaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;
  const isArabic = locale === 'ar';

  const gizaData = {
    name: 'Giza',
    nameAr: 'الجيزة',
    heroImage: '/assets/img/banner/banner-img-15.jpg',
    description:
      'Comprehensive home healthcare services throughout Giza. Expert medical professionals deliver quality care in the comfort of your home.',
    descriptionAr:
      'خدمات رعاية صحية منزلية شاملة في جميع أنحاء الجيزة. متخصصون طبيون خبراء يقدمون رعاية عالية الجودة في راحة منزلك.',
    stats: {
      doctors: 62,
      patients: 8500,
      neighborhoods: 35,
    },
    neighborhoods: [
      { name: '6th October', nameAr: '6 أكتوبر' },
      { name: 'Sheikh Zayed', nameAr: 'الشيخ زايد' },
      { name: 'Mohandessin', nameAr: 'المهندسين' },
      { name: 'Dokki', nameAr: 'الدقي' },
      { name: 'Agouza', nameAr: 'العجوزة' },
      { name: 'Haram', nameAr: 'الهرم' },
      { name: 'Faisal', nameAr: 'فيصل' },
      { name: 'Smart Village', nameAr: 'القرية الذكية' },
      { name: 'Beverly Hills', nameAr: 'بيفرلي هيلز' },
      { name: 'Hadayek October', nameAr: 'حدائق أكتوبر' },
    ],
  };

  const breadcrumbs = [
    {
      name: isArabic ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${locale}`,
    },
    {
      name: isArabic ? 'الجيزة' : 'Giza',
      url: `${baseUrl}/${locale}/giza`,
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  const breadcrumbItems = [
    { label: isArabic ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: isArabic ? 'الجيزة' : 'Giza', active: true },
  ];

  return (
    <>
      <Header />
      
      {/* Breadcrumb Schema */}
      <Script
        id="giza-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />

      <Breadcrumb items={breadcrumbItems} />
      
      <CityPageContent cityData={gizaData} locale={locale} />
      
      <Footer />
    </>
  );
}
