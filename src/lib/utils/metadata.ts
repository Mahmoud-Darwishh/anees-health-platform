/**
 * SEO Metadata Generator
 * 
 * Centralized utility for generating consistent, comprehensive metadata
 * across all pages for traditional SEO and GEO (Generative Engine Optimization)
 * 
 * Features:
 * - OpenGraph tags
 * - Twitter Cards
 * - Canonical URLs
 * - Alternate language links
 * - Structured data integration
 */

import { Metadata } from 'next';
import { config } from '@/lib/config';

export interface PageMetadataProps {
  locale: string;
  path: string;
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

/**
 * Generate comprehensive metadata for a page
 * 
 * @param props Page metadata configuration
 * @returns Next.js Metadata object
 */
export function generatePageMetadata({
  locale,
  path,
  title,
  description,
  keywords,
  image,
  imageAlt,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
}: PageMetadataProps): Metadata {
  const baseUrl = config.api.baseUrl;
  const canonicalUrl = `${baseUrl}${path}`;
  const fullTitle = `${title} | Anees Health`;
  const ogImage = image || `${baseUrl}/assets/img/banner/anees-health-og.jpg`;

  // Alternate language URLs
  const alternateLanguages = config.locales.supported.reduce((acc, loc) => {
    const altPath = path.replace(`/${locale}`, `/${loc}`);
    acc[loc] = `${baseUrl}${altPath}`;
    return acc;
  }, {} as Record<string, string>);

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords,
    authors: author ? [{ name: author }] : undefined,
    robots: noindex
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: 'Anees Health',
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      type,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt || title,
        },
      ],
      ...(type === 'article' && publishedTime
        ? {
            publishedTime,
            modifiedTime,
            authors: author ? [author] : undefined,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@aneeshealth',
      site: '@aneeshealth',
    },
  };

  return metadata;
}

/**
 * Generate metadata for homepage
 */
export function generateHomeMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}`,
    title: isArabic
      ? 'الرعاية الصحية المنزلية والتطبيب عن بعد في مصر'
      : 'Home Healthcare & Telemedicine in Egypt',
    description: isArabic
      ? 'منصة رائدة في مصر للرعاية الصحية المنزلية والتطبيب عن بعد للمسنين ومرضى الأمراض المزمنة—زيارات طبيب منزلي وزيارات منزلية (دكتور في البيت)، تمريض ماهر، علاج طبيعي، معامل منزلية، مراقبة عن بعد، إدارة الأدوية، ودعم طبي على مدار الساعة في القاهرة والجيزة والإسكندرية'
      : "Egypt's leading home healthcare and telemedicine platform for seniors and chronic care patients—doctor home visits (doctor at home), skilled nursing, physiotherapy, lab at home, remote monitoring, medication management, and 24/7 medical support across Cairo, Giza, and Alexandria",
    keywords: isArabic
      ? 'أنيس هيلث، رعاية صحية منزلية مصر، زيارة طبيب منزلي، زيارات منزلية، دكتور منزلي، طبيب في البيت، ممرضة منزلية مصر، تطبيب عن بعد مصر، علاج طبيعي منزلي، رعاية كبار السن القاهرة، إدارة الأمراض المزمنة، رعاية تلطيفية منزلية، رعاية ما بعد العمليات، تحاليل منزلية، مراقبة المرضى عن بعد، تأجير معدات طبية، افضل دكتور زيارات منزلية'
      : 'Anees Health, home healthcare Egypt, doctor home visit, doctor at home, home doctor visits Egypt, doctor home visit Cairo, home visits, home nurse Egypt, telemedicine Egypt, physiotherapy at home, elderly care Cairo, chronic disease management, palliative home care, post operative care, lab tests at home, remote patient monitoring, medical equipment rental',
  });
}

/**
 * Generate metadata for doctors listing
 */
export function generateDoctorsMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/doctors`,
    title: isArabic ? 'أطبائنا - زيارات منزلية' : 'Our Doctors - Home Visits',
    description: isArabic
      ? 'تعرف على فريقنا من الأطباء المتخصصين والمعتمدين للزيارات المنزلية وطبيب في البيت في القاهرة والجيزة والإسكندرية. طب باطني، طب المسنين، علاج طبيعي، تمريض منزلي، ورعاية الأمراض المزمنة'
      : 'Meet our team of certified, experienced doctors for home visits and doctor-at-home services across Cairo, Giza, and Alexandria. Internal medicine, geriatrics, physiotherapy, home nursing, and chronic disease management specialists',
    keywords: isArabic
      ? 'أطباء زيارة منزلية مصر، طبيب منزلي القاهرة، دكتور منزلي، طبيب في البيت، زيارات منزلية، افضل دكتور زيارات منزلية، أطباء مسنين، أطباء أمراض مزمنة، طبيب باطنة منزلي، أخصائي علاج طبيعي منزلي'
      : 'home visit doctors Egypt, doctor home visit Cairo, doctor at home, home doctor in Egypt, in-home physician, geriatric doctors, chronic care physicians, internal medicine home visit, home physiotherapist, best home visit doctor',
  });
}

/**
 * Generate metadata for services
 */
export function generateServicesMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/services`,
    title: isArabic ? 'خدماتنا الطبية المنزلية' : 'Our Home Healthcare Services',
    description: isArabic
      ? 'خدمات رعاية صحية شاملة في منزلك: زيارات طبيب، تمريض منزلي، علاج طبيعي، معامل منزلية، مراقبة عن بعد، إدارة الأدوية، رعاية ما بعد العمليات، ورعاية تلطيفية'
      : 'Comprehensive home healthcare services: doctor visits, skilled nursing, physiotherapy, lab tests at home, remote monitoring, medication management, post-operative care, and palliative care',
    keywords: isArabic
      ? 'خدمات طبية منزلية، رعاية صحية منزلية، تمريض منزلي، علاج طبيعي منزلي، زيارة طبيب منزلي، دكتور منزلي، طبيب في البيت، زيارات منزلية، معامل منزلية، رعاية ما بعد العمليات، مراقبة عن بعد'
      : 'home medical services, home healthcare, home nursing, home physiotherapy, doctor at home, home visit doctor, lab at home, post-operative care, remote monitoring, home visit service',
  });
}

/**
 * Generate metadata for coverage area
 */
export function generateCoverageMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/coverage`,
    title: isArabic ? 'مناطق تغطيتنا' : 'Service Coverage Areas',
    description: isArabic
      ? 'نغطي القاهرة، الجيزة، والإسكندرية بخدمات رعاية صحية منزلية شاملة. تحقق من توفر خدماتنا في منطقتك'
      : 'We serve Cairo, Giza, and Alexandria with comprehensive home healthcare services. Check service availability in your area',
    keywords: isArabic
      ? 'رعاية صحية منزلية القاهرة، رعاية منزلية الجيزة، خدمات طبية الإسكندرية، مناطق تغطية'
      : 'home healthcare Cairo, home care Giza, medical services Alexandria, service coverage',
  });
}

/**
 * Generate metadata for individual doctor profile
 * Enhanced for SEO and GEO
 */
export function generateDoctorProfileMetadata(
  doctor: {
    doctorName: string;
    speciality: string;
    professionalTitle: string;
    experienceYears: number;
    channels: string[];
    bio: string;
    image: string;
    location: string;
    languages: string[];
  },
  locale: string,
  slug: string
): Metadata {
  const isArabic = locale === 'ar';
  const baseUrl = config.api.baseUrl;
  const canonicalUrl = `${baseUrl}/${locale}/doctors/${slug}`;

  // Extract city from location
  const city = doctor.location.split(',')[0]?.trim() || doctor.location;

  const title = isArabic
    ? `${doctor.doctorName} - ${doctor.speciality} في ${city} (زيارات منزلية)`
    : `${doctor.doctorName} - ${doctor.speciality} in ${city} (Home Visits)`;

  const description = isArabic
    ? `احجز زيارة منزلية مع ${doctor.doctorName}، ${doctor.professionalTitle}. ${doctor.experienceYears}+ سنوات خبرة في ${doctor.speciality}. متاح للزيارات المنزلية وطبيب في البيت عبر ${doctor.channels.join('، ')}. ${doctor.bio.substring(0, 100)}...`
    : `Book a doctor-at-home visit with ${doctor.doctorName}, ${doctor.professionalTitle}. ${doctor.experienceYears}+ years in ${doctor.speciality}. Available for home visits and doctor-at-home via ${doctor.channels.join(', ')}. ${doctor.bio.substring(0, 100)}...`;

  const keywords = isArabic
    ? `${doctor.doctorName}, ${doctor.speciality}, طبيب ${city}, زيارة منزلية، دكتور منزلي، طبيب في البيت، افضل دكتور زيارات منزلية، ${doctor.professionalTitle}, ${doctor.channels.join('، ')}, ${doctor.languages.join('، ')}`
    : `${doctor.doctorName}, ${doctor.speciality}, ${city} doctor, home visit doctor, doctor at home, in-home physician, best home visit doctor, ${doctor.professionalTitle}, ${doctor.channels.join(', ')}, ${doctor.languages.join(', ')}`;

  const imageUrl = doctor.image.startsWith('http')
    ? doctor.image
    : `${baseUrl}/${doctor.image}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-US': `${baseUrl}/en/doctors/${slug}`,
        'ar-EG': `${baseUrl}/ar/doctors/${slug}`,
        'x-default': `${baseUrl}/en/doctors/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Anees Health',
      locale: isArabic ? 'ar_EG' : 'en_US',
      type: 'profile',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: `${doctor.doctorName} - ${doctor.speciality}`,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [imageUrl],
      creator: '@aneeshealth',
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

/**
 * Helper to generate language alternates for link tags
 */
export function generateLanguageAlternates(currentPath: string) {
  const baseUrl = config.api.baseUrl;
  const locales = config.locales.supported;

  return locales.map((locale) => {
    const path = currentPath.replace(/^\/(en|ar)/, `/${locale}`);
    return {
      hrefLang: locale === 'ar' ? 'ar-EG' : 'en-US',
      href: `${baseUrl}${path}`,
    };
  });
}

/**
 * Generate metadata for About Us page
 */
export function generateAboutMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/about-us`,
    title: isArabic ? 'من نحن - رعاية صحية منزلية' : 'About Us - Home Healthcare',
    description: isArabic
      ? 'تعرف على أنيس هيلث، منصة الرعاية الصحية المنزلية الرائدة في مصر. مهمتنا تقديم رعاية صحية عالية الجودة للمسنين ومرضى الأمراض المزمنة في منازلهم عبر القاهرة والجيزة والإسكندرية'
      : 'Learn about Anees Health, Egypt\'s leading home healthcare platform. Our mission is to deliver high-quality healthcare to seniors and chronic care patients in their homes across Cairo, Giza, and Alexandria',
    keywords: isArabic
      ? 'أنيس هيلث، من نحن، رعاية صحية منزلية مصر، رسالتنا، رؤيتنا، فريقنا'
      : 'Anees Health, about us, home healthcare Egypt, our mission, our vision, our team',
  });
}

/**
 * Generate metadata for Contact Us page
 */
export function generateContactMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/contact-us`,
    title: isArabic ? 'اتصل بنا - نحن هنا للمساعدة' : 'Contact Us - We\'re Here to Help',
    description: isArabic
      ? 'تواصل مع فريق أنيس هيلث. نحن متاحون على مدار الساعة للإجابة على استفساراتك وحجز المواعيد وتقديم المساعدة. اتصل بنا عبر الهاتف أو الواتساب أو البريد الإلكتروني'
      : 'Get in touch with Anees Health team. We\'re available 24/7 to answer your questions, book appointments, and provide assistance. Contact us via phone, WhatsApp, or email',
    keywords: isArabic
      ? 'اتصل بنا، أنيس هيلث، دعم العملاء، حجز موعد، خدمة عملاء، رقم الهاتف، واتساب'
      : 'contact us, Anees Health, customer support, book appointment, customer service, phone number, WhatsApp',
  });
}

/**
 * Generate metadata for Privacy Policy page
 */
export function generatePrivacyMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/privacy-policy`,
    title: isArabic ? 'سياسة الخصوصية' : 'Privacy Policy',
    description: isArabic
      ? 'سياسة خصوصية أنيس هيلث: كيفية جمع واستخدام وحماية معلوماتك الشخصية والصحية. نحن ملتزمون بحماية خصوصيتك وأمن بياناتك الطبية'
      : 'Anees Health Privacy Policy: How we collect, use, and protect your personal and health information. We are committed to protecting your privacy and medical data security',
    keywords: isArabic
      ? 'سياسة الخصوصية، حماية البيانات، خصوصية المعلومات الصحية، أمن البيانات، HIPAA'
      : 'privacy policy, data protection, health information privacy, data security, HIPAA',
    noindex: true, // Legal pages typically don't need indexing
  });
}

/**
 * Generate metadata for Terms and Conditions page
 */
export function generateTermsMetadata(locale: string): Metadata {
  const isArabic = locale === 'ar';

  return generatePageMetadata({
    locale,
    path: `/${locale}/terms-and-conditions`,
    title: isArabic ? 'الشروط والأحكام' : 'Terms and Conditions',
    description: isArabic
      ? 'شروط وأحكام استخدام خدمات أنيس هيلث. اقرأ شروط الخدمة، سياسة الإلغاء، والمسؤوليات والالتزامات قبل استخدام خدماتنا'
      : 'Terms and conditions for using Anees Health services. Read our terms of service, cancellation policy, and responsibilities before using our services',
    keywords: isArabic
      ? 'الشروط والأحكام، شروط الخدمة، شروط الاستخدام، سياسة الإلغاء'
      : 'terms and conditions, terms of service, terms of use, cancellation policy',
    noindex: true, // Legal pages typically don't need indexing
  });
}
