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
  // Optimized title: Avoid "Anees Health | Anees Health" redundancy
  // Include "Anees" for brand searches and core service info
  const fullTitle = title.includes('Anees') ? title : `${title} | Anees`;
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
      ? 'أنيس هيلث - رعاية صحية منزلية وتطبيب عن بعد مصر'
      : 'Anees Health - Home Healthcare & Telemedicine Egypt',
    description: isArabic
      ? 'أنيس: منصة رائدة في مصر للرعاية الصحية المنزلية والتطبيب عن بعد—زيارات طبيب منزلي، تمريض ماهر، علاج طبيعي، معامل منزلية، مراقبة عن بعد في مختلف المناطق'
      : "Anees: Egypt's leading home healthcare and telemedicine platform—doctor home visits, skilled nursing, physiotherapy, lab at home, remote monitoring across Egypt",
    keywords: isArabic
      ? 'أنيس، Anees، رعاية صحية منزلية مصر، زيارة طبيب منزلي، دكتور منزلي، ممرضة منزلية، طبيب في البيت، تطبيب عن بعد، علاج طبيعي منزلي، رعاية كبار السن، إدارة الأمراض المزمنة'
      : 'Anees, home healthcare Egypt, doctor home visit, home doctor, home nurse, telemedicine Egypt, home physiotherapy, elderly care, chronic disease management, remote monitoring, lab at home',
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
    title: isArabic 
      ? 'أطبائنا - أنيس هيلث | زيارات منزلية' 
      : 'Our Doctors | Anees Health - Home Visits',
    description: isArabic
      ? 'فريق متخصص من الأطباء المعتمدين في أنيس للزيارات المنزلية والتطبيب عن بعد—طب باطني، طب مسنين، علاج طبيعي في مختلف المناطق'
      : 'Certified doctors on Anees platform for home visits and telemedicine—internal medicine, geriatrics, and physiotherapy specialists available across Egypt',
    keywords: isArabic
      ? 'أنيس، Anees، أطباء زيارة منزلية مصر، طبيب منزلي، دكتور منزلي، طبيب في البيت، أطباء متخصصون، أطباء مسنين، طبيب باطنة، علاج طبيعي منزلي، أطباء القاهرة، أطباء الجيزة'
      : 'Anees, home visit doctors Egypt, doctor at home, specialist physicians, geriatric doctors, internal medicine, home physiotherapists, professional healthcare',
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
    title: isArabic 
      ? 'خدماتنا الطبية - أنيس هيلث | رعاية منزلية' 
      : 'Our Services | Anees Health - Home Healthcare',
    description: isArabic
      ? 'خدمات أنيس الشاملة في مصر: زيارات طبيب منزلي، رعاية المسنين، تمريض منزلي، علاج طبيعي منزلي، تحاليل وأشعات منزلية، مراقبة المرضى عن بُعد، الرعاية الملطفة، إدارة الأدوية، ورعاية ما بعد العمليات.'
      : 'Anees comprehensive home healthcare services in Egypt: doctor home visits, elderly care, home nursing, physiotherapy, lab tests at home, home radiology scans, remote patient monitoring, palliative care, medication management, and post-operative care.',
    keywords: isArabic
      ? 'أنيس، Anees، خدمات صحية منزلية، خدمات طبية منزلية مصر، طبيب منزلي، زيارات طبيب منزلي، رعاية المسنين، رعاية كبار السن، تمريض منزلي، علاج طبيعي منزلي، تحاليل منزلية، أشعة منزلية، أشعات بالمنزل، مراقبة المريض عن بعد، الرعاية الملطفة، إدارة الأدوية، رعاية ما بعد العمليات، أمراض مزمنة'
      : 'Anees services, home healthcare Egypt, home medical services, doctor home visit, doctor at home, elderly care, geriatrics, home nursing, home physiotherapy, lab tests at home, home radiology, scans at home, remote patient monitoring, palliative care, medication delivery, post-operative care, chronic disease management',
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
    title: isArabic 
      ? 'مناطق تغطيتنا - أنيس هيلث | خريطة الخدمات' 
      : 'Service Coverage | Anees Health - Where We Serve',
    description: isArabic
      ? 'خرائط خدمات أنيس في مختلف المناطق—رعاية صحية منزلية في منطقتك. تحقق من توفر خدماتنا والعناوين المخدومة'
      : 'Anees service coverage maps across Egypt—home healthcare available in your area. Check service availability and covered locations',
    keywords: isArabic
      ? 'أنيس، Anees، مناطق تغطية، خدمات طبية، رعاية منزلية مصر، مناطق الخدمة'
      : 'Anees coverage, service areas Egypt, home healthcare locations, service coverage Egypt, available areas',
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
    ? `${doctor.doctorName} - ${doctor.speciality} | أنيس`
    : `${doctor.doctorName} - ${doctor.speciality} | Anees`;

  const description = isArabic
    ? `احجز مع ${doctor.doctorName} (${doctor.professionalTitle}) عبر أنيس. ${doctor.experienceYears}+ سنوات خبرة في ${doctor.speciality}. متخصص في الزيارات المنزلية في ${city}. يتحدث ${doctor.languages.join('، ')}. اطلب طبيب في البيت الآن.`
    : `Book with ${doctor.doctorName} (${doctor.professionalTitle}) on Anees. ${doctor.experienceYears}+ years in ${doctor.speciality}. Home visit specialist in ${city}. Speaks ${doctor.languages.join(', ')}. Request doctor-at-home now.`;

  const keywords = isArabic
    ? `أنيس، ${doctor.doctorName}، ${doctor.speciality}، دكتور ${city}، طبيب منزلي ${city}، زيارة منزلية ${city}، دكتور في البيت، ${doctor.professionalTitle}، أنيس ${doctor.speciality}`
    : `Anees, ${doctor.doctorName}, ${doctor.speciality}, doctor in ${city}, home visit doctor, doctor at home, ${city} ${doctor.speciality}, ${doctor.professionalTitle}, Anees ${doctor.speciality}`;

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
    title: isArabic ? 'عن أنيس هيلث | الدكتور محمود درويش والدكتور أحمد عرابي' : 'About Anees Health | Dr. Mahmoud Darwish and Dr. Ahmed Oraby',
    description: isArabic
      ? 'أنيس هيلث منصة رعاية صحية منزلية في مصر تأسست بقيادة الدكتور محمود درويش والدكتور أحمد عرابي، مع زيارات طبيب منزلية وخدمات رعاية صحية متكاملة.'
      : 'Anees Health is a home healthcare platform in Egypt founded by Dr. Mahmoud Darwish and Dr. Ahmed Oraby, offering doctor home visits and coordinated healthcare services.',
    keywords: isArabic
      ? 'أنيس هيلث، مؤسسو أنيس هيلث، الدكتور محمود درويش، الدكتور أحمد عرابي، محمود درويش، أحمد عرابي، رعاية صحية منزلية، طبيب منزل، مصر'
      : 'Anees Health founders, Dr. Mahmoud Darwish, Dr. Ahmed Oraby, Mahmoud Darwish, Ahmed Oraby, doctor at home Egypt, home healthcare Egypt',
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
    title: isArabic ? 'اتصل بنا - أنيس هيلث | دعم 24/7' : 'Contact Anees Health - 24/7 Support',
    description: isArabic
      ? 'تواصل مع أنيس. فريقنا متاح على مدار الساعة للإجابة على استفساراتك وحجز خدمات الرعاية الصحية المنزلية. اتصل عبر الهاتف أو واتساب'
      : 'Contact Anees. Our team available 24/7 for inquiries and home healthcare bookings. Call, WhatsApp, or email us anytime',
    keywords: isArabic
      ? 'أنيس، Anees، اتصل بنا، دعم عملاء، رقم الهاتف، واتساب، حجز موعد، خدمة عملاء'
      : 'Anees contact, customer support, phone number, WhatsApp, book appointment, help',
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
    title: isArabic ? 'سياسة الخصوصية - أنيس هيلث' : 'Privacy Policy - Anees Health',
    description: isArabic
      ? 'سياسة خصوصية أنيس: نحن نحمي معلوماتك الشخصية والصحية بأعلى معايير الأمان. اطلع على كيفية جمع واستخدام ومعالجة بياناتك'
      : 'Anees Privacy Policy: Your personal and health data protected with highest security standards. See how we collect, use, and safeguard your information',
    keywords: isArabic
      ? 'أنيس، سياسة الخصوصية، حماية البيانات، أمان المعلومات الصحية، HIPAA، خصوصية'
      : 'Anees privacy, data protection, health information security, HIPAA, data privacy',
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
    title: isArabic ? 'الشروط والأحكام - أنيس هيلث' : 'Terms and Conditions - Anees Health',
    description: isArabic
      ? 'شروط وأحكام أنيس: اقرأ شروط الخدمة وسياسة الإلغاء والمسؤوليات قبل حجز خدمات الرعاية الصحية المنزلية'
      : 'Anees Terms and Conditions: Read our service terms, cancellation policy, and responsibilities before booking home healthcare',
    keywords: isArabic
      ? 'أنيس، الشروط والأحكام، شروط الخدمة، سياسة الإلغاء، شروط الاستخدام'
      : 'Anees, terms and conditions, service terms, cancellation policy',
    noindex: true, // Legal pages typically don't need indexing
  });
}
