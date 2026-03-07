import { Metadata } from 'next';
import Script from 'next/script';
import { generateServicesMetadata } from '@/lib/utils/metadata';
import { renderJsonLd, generateFAQSchema } from '@/lib/utils/structured-data';
import { config } from '@/lib/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    ...generateServicesMetadata(locale),
    category: locale === 'ar' ? 'الرعاية الصحية المنزلية' : 'Home Healthcare Services',
    classification: locale === 'ar' ? 'خدمات طبية منزلية' : 'Medical Services',
  };
}

export default async function ServicesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
      searchTermsEn: ['doctor at home', 'home visit doctor', 'medical home visit'],
      searchTermsAr: ['طبيب منزلي', 'زيارة طبيب منزلي', 'دكتور في البيت'],
      slug: 'doctor-visits',
    },
    {
      id: 'elderly-care',
      titleEn: 'Elderly Care & Geriatrics',
      titleAr: 'رعاية المسنين والعناية الصحية لكبار السن',
      descriptionEn: 'Specialized geriatric care for seniors and elderly patients, including chronic disease management, medication monitoring, and comprehensive health support for older adults',
      descriptionAr: 'رعاية متخصصة للمسنين تشمل إدارة الأمراض المزمنة ومراقبة الأدوية والدعم الصحي الشامل لكبار السن والعناية الصحية للمسنات والمسنين',
      searchTermsEn: ['elderly care', 'geriatrics', 'senior home care'],
      searchTermsAr: ['رعاية المسنين', 'طب الشيخوخة', 'رعاية كبار السن'],
      slug: 'elderly-care',
    },
    {
      id: 'telemedicine',
      titleEn: 'Telemedicine Consultations',
      titleAr: 'استشارات طبية عن بعد',
      descriptionEn: 'Remote video consultations with licensed doctors without leaving home',
      descriptionAr: 'استشارات طبية عن بعد عبر الفيديو مع أطباء مرخصين دون مغادرة المنزل',
      searchTermsEn: ['online doctor consultation', 'telehealth', 'video consultation'],
      searchTermsAr: ['استشارة طبية اونلاين', 'تطبيب عن بعد', 'استشارات فيديو'],
      slug: 'telemedicine',
    },
    {
      id: 'nursing-care',
      titleEn: 'Home Nursing Care',
      titleAr: 'رعاية تمريضية منزلية',
      descriptionEn: 'Skilled nursing services including wound care, injections, medication management, and patient monitoring',
      descriptionAr: 'خدمات تمريضية متخصصة تشمل رعاية الجروح والحقن وإدارة الأدوية ومراقبة المريض',
      searchTermsEn: ['home nursing', 'nurse at home', 'home nurse'],
      searchTermsAr: ['تمريض منزلي', 'ممرضة منزلية', 'تمريض في المنزل'],
      slug: 'nursing-care',
    },
    {
      id: 'physiotherapy',
      titleEn: 'Home Physiotherapy',
      titleAr: 'العلاج الطبيعي المنزلي',
      descriptionEn: 'Professional physiotherapy sessions at home for rehabilitation and recovery',
      descriptionAr: 'جلسات علاج طبيعي احترافية في المنزل للتأهيل والشفاء',
      searchTermsEn: ['physiotherapy at home', 'home physical therapy', 'rehabilitation at home'],
      searchTermsAr: ['علاج طبيعي منزلي', 'جلسات علاج طبيعي في المنزل', 'تأهيل منزلي'],
      slug: 'physiotherapy',
    },
    {
      id: 'lab-tests',
      titleEn: 'Lab Tests at Home',
      titleAr: 'فحوصات معملية منزلية',
      descriptionEn: 'Blood tests and diagnostic services collected at your home with professional care',
      descriptionAr: 'اختبارات الدم والخدمات التشخيصية التي يتم جمعها في منزلك برعاية احترافية',
      searchTermsEn: ['lab at home', 'blood test at home', 'home diagnostic tests'],
      searchTermsAr: ['تحاليل في المنزل', 'تحاليل منزلية', 'اختبارات دم في المنزل'],
      slug: 'lab-tests',
    },
    {
      id: 'medications',
      titleEn: 'Medication Delivery & Management',
      titleAr: 'توصيل الأدوية وإدارتها',
      descriptionEn: 'Prescription delivery and medication management services for convenient healthcare',
      descriptionAr: 'خدمات توصيل الوصفات الطبية وإدارة الأدوية للرعاية الصحية المريحة',
      searchTermsEn: ['medication delivery', 'medicine delivery', 'prescription home delivery'],
      searchTermsAr: ['توصيل أدوية', 'توصيل دواء', 'توصيل وصفة طبية'],
      slug: 'medications',
    },
    {
      id: 'post-operative',
      titleEn: 'Post-Operative Care',
      titleAr: 'الرعاية بعد العمليات الجراحية',
      descriptionEn: 'Comprehensive care following surgery including wound care and recovery monitoring',
      descriptionAr: 'رعاية شاملة بعد الجراحة تشمل رعاية الجروح ومراقبة التعافي',
      searchTermsEn: ['post-surgery care', 'post operative home care', 'recovery care at home'],
      searchTermsAr: ['رعاية بعد العملية', 'رعاية ما بعد الجراحة', 'متابعة التعافي في المنزل'],
      slug: 'post-operative',
    },
    {
      id: 'remote-monitoring',
      titleEn: 'Remote Patient Monitoring',
      titleAr: 'مراقبة المريض عن بعد',
      descriptionEn: 'Continuous health monitoring for chronic conditions and elderly care',
      descriptionAr: 'مراقبة صحية مستمرة للأمراض المزمنة ورعاية المسنين',
      searchTermsEn: ['remote patient monitoring', 'rpm healthcare', 'chronic care monitoring'],
      searchTermsAr: ['مراقبة المريض عن بعد', 'مراقبة صحية عن بعد', 'متابعة الأمراض المزمنة عن بعد'],
      slug: 'remote-monitoring',
    },
    {
      id: 'home-radiology',
      titleEn: 'Home Radiology & Scans',
      titleAr: 'الأشعات والفحوصات بالمنزل',
      descriptionEn: 'Portable diagnostic imaging and radiology scan services provided at home by certified specialists',
      descriptionAr: 'خدمات أشعة وفحوصات تشخيصية محمولة بالمنزل يقدمها مختصون معتمدون',
      searchTermsEn: ['radiology at home', 'scans at home', 'xray at home'],
      searchTermsAr: ['أشعة منزلية', 'فحوصات أشعة بالمنزل', 'سكان في المنزل'],
      slug: 'home-radiology',
    },
    {
      id: 'palliative-care',
      titleEn: 'Palliative Care',
      titleAr: 'الرعاية الملطفة',
      descriptionEn: 'Compassionate palliative and supportive care focused on comfort, symptom relief, and quality of life',
      descriptionAr: 'رعاية ملطفة داعمة تركز على الراحة وتخفيف الأعراض وتحسين جودة الحياة',
      searchTermsEn: ['palliative care at home', 'comfort care', 'supportive care'],
      searchTermsAr: ['رعاية ملطفة', 'رعاية تلطيفية', 'رعاية داعمة بالمنزل'],
      slug: 'palliative-care',
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
        '@id': `${baseUrl}/${locale}/services#${service.id}`,
        name: locale === 'ar' ? service.titleAr : service.titleEn,
        description: locale === 'ar' ? service.descriptionAr : service.descriptionEn,
        keywords: locale === 'ar' ? service.searchTermsAr.join(', ') : service.searchTermsEn.join(', '),
        alternateName: locale === 'ar' ? service.searchTermsAr : service.searchTermsEn,
        procedureType: locale === 'ar' ? 'خدمة رعاية صحية منزلية' : 'Home healthcare service',
        url: `${baseUrl}/${locale}/services#${service.id}`,
        provider: {
          '@type': 'MedicalOrganization',
          '@id': `${baseUrl}#organization`,
          name: 'Anees Health',
        },
      },
    })),
  };

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
      {children}
    </>
  );
}
