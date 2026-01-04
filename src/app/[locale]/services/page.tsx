import { Metadata } from 'next';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { generateServicesMetadata } from '@/lib/utils/metadata';
import { renderJsonLd, generateFAQSchema } from '@/lib/utils/structured-data';
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
      ? 'خدماتنا الطبية المنزلية - رعاية المسنين والعناية الصحية المنزلية' 
      : 'Our Services - Home Healthcare, Doctor Home Visits, Elderly Care',
    description: isArabic
      ? 'خدمات صحية منزلية شاملة: زيارات طبيب منزلي، رعاية المسنين، العلاج الطبيعي المنزلي، تمريض منزلي، رعاية المسنات والعناية بكبار السن. أطباء متخصصين في الأمراض المزمنة والعناية الصحية للمسنين.'
      : 'Comprehensive home healthcare services: doctor home visits, elderly care, geriatrics, home physiotherapy, nursing care, medical home visits for seniors. Specialized doctors for chronic diseases and elderly health care.',
    keywords: isArabic
      ? 'زيارات طبيب منزلي، رعاية المسنين، طبيب في البيت، علاج طبيعي منزلي، تمريض منزلي، رعاية صحية منزلية، أمراض المسنين، رعاية كبار السن، طبيب متخصص للمسنين، خدمات صحية منزلية، geriatrics'
      : 'home visit doctor, doctor home visits, elderly care, geriatrics, physiotherapy at home, home physiotherapist, medical home visit, home healthcare, nursing care at home, chronic disease management, senior health care, health care for elderly',
    ...generateServicesMetadata(locale),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const baseUrl = config.api.baseUrl;

  // Services list for schema generation
  const servicesData = [
    {
      id: 'doctor-visits',
      titleEn: 'Doctor Home Visits',
      titleAr: 'زيارات طبيب منزلي',
      descriptionEn: 'Professional doctor visits in the comfort of your home for consultations, examinations, and medical care',
      descriptionAr: 'زيارات طبيب احترافية في منزلك لإجراء الاستشارات والفحوصات والرعاية الطبية',
      slug: 'doctor-visits',
    },
    {
      id: 'elderly-care',
      titleEn: 'Elderly Care & Geriatrics',
      titleAr: 'رعاية المسنين والعناية الصحية لكبار السن',
      descriptionEn: 'Specialized geriatric care for seniors and elderly patients, including chronic disease management, medication monitoring, and comprehensive health support for older adults',
      descriptionAr: 'رعاية متخصصة للمسنين تشمل إدارة الأمراض المزمنة ومراقبة الأدوية والدعم الصحي الشامل لكبار السن والعناية الصحية للمسنات والمسنين',
      slug: 'elderly-care',
    },
    {
      id: 'telemedicine',
      titleEn: 'Telemedicine Consultations',
      titleAr: 'استشارات طبية عن بعد',
      descriptionEn: 'Remote video consultations with licensed doctors without leaving home',
      descriptionAr: 'استشارات طبية عن بعد عبر الفيديو مع أطباء مرخصين دون مغادرة المنزل',
      slug: 'telemedicine',
    },
    {
      id: 'nursing-care',
      titleEn: 'Home Nursing Care',
      titleAr: 'رعاية تمريضية منزلية',
      descriptionEn: 'Skilled nursing services including wound care, injections, medication management, and patient monitoring',
      descriptionAr: 'خدمات تمريضية متخصصة تشمل رعاية الجروح والحقن وإدارة الأدوية ومراقبة المريض',
      slug: 'nursing-care',
    },
    {
      id: 'physiotherapy',
      titleEn: 'Home Physiotherapy',
      titleAr: 'العلاج الطبيعي المنزلي',
      descriptionEn: 'Professional physiotherapy sessions at home for rehabilitation and recovery',
      descriptionAr: 'جلسات علاج طبيعي احترافية في المنزل للتأهيل والشفاء',
      slug: 'physiotherapy',
    },
    {
      id: 'lab-tests',
      titleEn: 'Lab Tests at Home',
      titleAr: 'فحوصات معملية منزلية',
      descriptionEn: 'Blood tests and diagnostic services collected at your home with professional care',
      descriptionAr: 'اختبارات الدم والخدمات التشخيصية التي يتم جمعها في منزلك برعاية احترافية',
      slug: 'lab-tests',
    },
    {
      id: 'medications',
      titleEn: 'Medication Delivery & Management',
      titleAr: 'توصيل الأدوية وإدارتها',
      descriptionEn: 'Prescription delivery and medication management services for convenient healthcare',
      descriptionAr: 'خدمات توصيل الوصفات الطبية وإدارة الأدوية للرعاية الصحية المريحة',
      slug: 'medications',
    },
    {
      id: 'post-operative',
      titleEn: 'Post-Operative Care',
      titleAr: 'الرعاية بعد العمليات الجراحية',
      descriptionEn: 'Comprehensive care following surgery including wound care and recovery monitoring',
      descriptionAr: 'رعاية شاملة بعد الجراحة تشمل رعاية الجروح ومراقبة التعافي',
      slug: 'post-operative',
    },
    {
      id: 'remote-monitoring',
      titleEn: 'Remote Patient Monitoring',
      titleAr: 'مراقبة المريض عن بعد',
      descriptionEn: 'Continuous health monitoring for chronic conditions and elderly care',
      descriptionAr: 'مراقبة صحية مستمرة للأمراض المزمنة ورعاية المسنين',
      slug: 'remote-monitoring',
    },
  ];

  // FAQ Schema for common searches
  const faqData = locale === 'ar' ? [
    { question: 'ما هي رعاية المسنين؟', answer: 'رعاية المسنين هي خدمات صحية متخصصة للعناية بكبار السن والمسنين، تشمل إدارة الأمراض المزمنة والمراقبة الصحية المستمرة.' },
    { question: 'هل توفرون خدمة زيارة طبيب منزلي؟', answer: 'نعم، نوفر خدمة زيارات طبيب منزلي محترفة للاستشارات والفحوصات الطبية والرعاية الصحية في منزلك.' },
    { question: 'ما هي تخصصات الأطباء لديكم؟', answer: 'لدينا أطباء متخصصون في جميع المجالات الطبية بما فيها طب المسنين (Geriatrics) والأمراض المزمنة والعلاج الطبيعي وتمريض البيت.' },
    { question: 'هل تتوفر خدمات للمسنين والعناية بكبار السن؟', answer: 'نعم، نقدم خدمات متخصصة للمسنين والعناية الصحية لكبار السن، بما فيها الرعاية المنزلية والمراقبة الصحية والدعم الطبي المستمر.' },
    { question: 'هل يمكنكم علاج الأمراض المزمنة للمسنين؟', answer: 'نعم، نقدم إدارة شاملة للأمراض المزمنة للمسنين مثل السكري وارتفاع ضغط الدم والأمراض القلبية.' },
  ] : [
    { question: 'What is elderly care and geriatrics?', answer: 'Elderly care and geriatrics are specialized healthcare services for seniors and older adults, including chronic disease management, health monitoring, and comprehensive medical support.' },
    { question: 'Do you provide doctor home visits?', answer: 'Yes, we provide professional home visit services with licensed doctors for consultations, medical examinations, and healthcare at your home.' },
    { question: 'What medical home visit services do you offer?', answer: 'We offer comprehensive medical home visit services including doctor consultations, nursing care, physiotherapy, lab tests, and medication management at home.' },
    { question: 'Do you have doctors specializing in geriatrics?', answer: 'Yes, our team includes doctors specialized in geriatrics and elderly care, as well as specialists in chronic diseases and home healthcare.' },
    { question: 'Can you help with chronic diseases in elderly patients?', answer: 'Yes, we provide comprehensive management of chronic diseases in elderly patients including diabetes, hypertension, heart disease, and other age-related conditions.' },
  ];

  const faqSchema = generateFAQSchema(faqData);

  // Breadcrumb schema
  const breadcrumbs = [
    {
      name: locale === 'ar' ? 'الرئيسية' : 'Home',
      url: `${baseUrl}/${locale}`,
    },
    {
      name: locale === 'ar' ? 'خدماتنا' : 'Our Services',
      url: `${baseUrl}/${locale}/services`,
    },
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  // Generate service collection schema
  const servicesCollectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'ar' ? 'خدمات أنيس هيلث' : 'Anees Health Services',
    description:
      locale === 'ar'
        ? 'قائمة خدمات الرعاية الصحية المنزلية الشاملة في مصر'
        : 'Comprehensive home healthcare services in Egypt',
    url: `${baseUrl}/${locale}/services`,
    numberOfItems: servicesData.length,
    itemListElement: servicesData.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'MedicalProcedure',
        name: locale === 'ar' ? service.titleAr : service.titleEn,
        description: locale === 'ar' ? service.descriptionAr : service.descriptionEn,
        url: `${baseUrl}/${locale}/services/${service.slug}`,
        provider: {
          '@type': 'MedicalOrganization',
          '@id': `${baseUrl}#organization`,
          name: 'Anees Health',
        },
      },
    })),
  };

  const breadcrumbItems = [
    { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: locale === 'ar' ? 'خدماتنا' : 'Our Services', active: true },
  ];

  return (
    <>
      {/* Structured Data */}
      <Script
        id="services-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <Script
        id="services-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(servicesCollectionSchema) }}
      />
      <Script
        id="services-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(faqSchema) }}
      />

      <Header />
      <Breadcrumb items={breadcrumbItems} title={locale === 'ar' ? 'خدماتنا' : 'Our Services'} />

      {/* Services Section */}
      <section className="services-section py-5">
        <div className="container">
          <div className="row g-4">
            {servicesData.map((service) => (
              <div key={service.id} className="col-lg-4 col-md-6">
                <div className="service-card h-100 p-4 rounded-4 border">
                  <div className="service-icon mb-3">
                    <i className="isax isax-heart"></i>
                  </div>
                  <h4 className="mb-3">
                    {locale === 'ar' ? service.titleAr : service.titleEn}
                  </h4>
                  <p className="text-muted">
                    {locale === 'ar' ? service.descriptionAr : service.descriptionEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
