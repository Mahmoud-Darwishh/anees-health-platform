/**
 * Structured Data (JSON-LD) Utilities
 * 
 * Generates schema.org structured data for:
 * - Organization
 * - MedicalOrganization
 * - LocalBusiness
 * - FAQPage
 * - BreadcrumbList
 * - MedicalService
 * 
 * For SEO and GEO (Generative Engine Optimization)
 */

import { config } from '../config';
import type { Doctor } from '../models/doctor.types';

export interface StructuredDataProps {
  locale?: string;
  type: 'organization' | 'medical' | 'faq' | 'breadcrumb' | 'service' | 'doctor';
  data?: Record<string, unknown>;
}

/**
 * Organization Schema
 * Used for brand identity and social presence
 */
export function generateOrganizationSchema(locale: string = 'en') {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    '@id': `${config.api.baseUrl}#organization`,
    name: 'Anees Health',
    alternateName: locale === 'ar' ? 'أنيس هيلث' : 'Anees Health',
    description:
      locale === 'ar'
        ? 'منصة رائدة في مصر للرعاية الصحية المنزلية والتطبيب عن بعد للمسنين ومرضى الأمراض المزمنة—زيارات طبيب منزلي، تمريض ماهر، علاج طبيعي، معامل منزلية، مراقبة عن بعد، إدارة الأدوية، ودعم طبي على مدار الساعة في القاهرة والجيزة والإسكندرية'
        : "Egypt's leading home healthcare and telemedicine platform for seniors and chronic care patients—doctor home visits, skilled nursing, physiotherapy, lab at home, remote monitoring, medication management, and 24/7 medical support across Cairo, Giza, and Alexandria",
    url: config.api.baseUrl,
    logo: `${config.api.baseUrl}/logos/anees-health-logo.png`,
    image: `${config.api.baseUrl}/assets/img/banner/anees-health-og.jpg`,
    telephone: '+20-1270558620',
    email: 'info@aneeshealth.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Cairo',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo Governorate',
      postalCode: '11511',
      addressCountry: 'EG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.0444,
      longitude: 31.2357,
    },
    areaServed: [
      {
        '@type': 'City',
        name: locale === 'ar' ? 'القاهرة' : 'Cairo',
      },
      {
        '@type': 'City',
        name: locale === 'ar' ? 'الجيزة' : 'Giza',
      },
      {
        '@type': 'City',
        name: locale === 'ar' ? 'الإسكندرية' : 'Alexandria',
      },
    ],
    sameAs: [
      'https://www.facebook.com/aneeshealth',
      'https://www.instagram.com/aneeshealth',
      'https://www.linkedin.com/company/anees-health',
      'https://twitter.com/aneeshealth',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+20-1270558620',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Arabic'],
      areaServed: 'EG',
    },
    knowsAbout: [
      'Home Healthcare',
      'Telemedicine',
      'Elderly Care',
      'Chronic Disease Management',
      'Doctor Home Visits',
      'Home Nursing',
      'Physiotherapy',
      'Palliative Care',
      'Remote Patient Monitoring',
    ],
    medicalSpecialty: [
      'Geriatrics',
      'Palliative Medicine',
      'Internal Medicine',
      'Family Medicine',
      'Physical Therapy',
      'Nursing',
      'Home Healthcare',
    ],
  };
}

/**
 * Local Business Schema
 * Enhances local SEO
 */
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${config.api.baseUrl}#business`,
    name: 'Anees Health',
    image: `${config.api.baseUrl}/assets/img/banner/anees-health-og.jpg`,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Cairo',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo Governorate',
      postalCode: '11511',
      addressCountry: 'EG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.0444,
      longitude: 31.2357,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '00:00',
        closes: '23:59',
      },
    ],
  };
}

/**
 * Medical Service Schema
 * For individual services
 */
export function generateMedicalServiceSchema(
  service: {
    name: string;
    description: string;
    slug: string;
  },
  locale: string = 'en'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: service.name,
    description: service.description,
    url: `${config.api.baseUrl}/${locale}/services/${service.slug}`,
    provider: {
      '@type': 'MedicalOrganization',
      name: 'Anees Health',
    },
  };
}

/**
 * Doctor/Physician Schema (Simple version)
 * For listing pages and simple references
 */
export function generateDoctorSchema(
  doctor: {
    name: string;
    specialty: string;
    bio: string;
    slug: string;
    image?: string;
  },
  locale: string = 'en'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.name,
    description: doctor.bio,
    image: doctor.image || `${config.api.baseUrl}/assets/img/doctors/default.jpg`,
    url: `${config.api.baseUrl}/${locale}/doctors/${doctor.slug}`,
    medicalSpecialty: doctor.specialty,
    worksFor: {
      '@type': 'MedicalOrganization',
      name: 'Anees Health',
    },
  };
}

/**
 * Enhanced Physician Schema (Complete version)
 * For individual doctor profile pages with full details
 * Optimized for SEO and GEO
 */
export function generatePhysicianSchema(
  doctor: Doctor,
  locale: string = 'en',
  canonicalUrl: string
) {
  const baseUrl = config.api.baseUrl;
  const imageUrl = doctor.image.startsWith('http')
    ? doctor.image
    : `${baseUrl}/${doctor.image}`;

  const priceRange = doctor.pricing?.homeVisit || doctor.pricing?.telemedicine
    ? [doctor.pricing.homeVisit, doctor.pricing.telemedicine, doctor.pricing.clinicVisit]
        .filter(Boolean)
        .join(' / ')
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': canonicalUrl,
    name: doctor.doctorName,
    alternateName: doctor.professionalTitle,
    description: doctor.bio,
    image: imageUrl,
    url: canonicalUrl,
    jobTitle: doctor.professionalTitle,
    gender: doctor.gender?.toLowerCase() === 'female' ? 'Female' : 'Male',
    knowsLanguage: doctor.languages?.map((lang: string) => ({
      '@type': 'Language',
      name: lang,
    })),
    medicalSpecialty: doctor.speciality,
    availableService: {
      '@type': 'MedicalProcedure',
      name: locale === 'ar' ? 'استشارة طبية' : 'Medical Consultation',
      description:
        locale === 'ar'
          ? `استشارة طبية مع ${doctor.doctorName}`
          : `Medical consultation with ${doctor.doctorName}`,
      availableChannel: doctor.channels?.map((channel: string) => ({
        '@type': 'ServiceChannel',
        name: channel,
      })),
    },
    worksFor: {
      '@type': 'MedicalOrganization',
      '@id': `${baseUrl}#organization`,
      name: 'Anees Health',
      url: baseUrl,
    },
    hasCredential: doctor.certifications?.map((cert: string) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certification',
      name: cert,
    })),
    alumniOf: doctor.education?.map((edu) => ({
      '@type': 'EducationalOrganization',
      name: edu.university,
      description: `${edu.degree}${edu.year ? ` (${edu.year})` : ''}`,
    })),
    aggregateRating: doctor.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: doctor.rating,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    areaServed: doctor.areaCoverage?.map((area: string) => ({
      '@type': 'City',
      name: area,
    })),
    priceRange,
  };
}

/**
 * ItemList Schema for Doctors Collection
 * For doctors listing page
 */
export function generateDoctorsCollectionSchema(
  doctors: Array<{
    doctorName: string;
    bio?: string;
    professionalTitle: string;
    image: string;
    profileLink: string;
    speciality: string;
    rating?: number;
  }>,
  locale: string = 'en',
  currentPage: number = 1
) {
  const baseUrl = config.api.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'ar' ? 'أطباء أنيس هيلث' : 'Anees Health Doctors',
    description:
      locale === 'ar'
        ? 'قائمة الأطباء المتاحين للزيارات المنزلية والاستشارات الطبية عن بعد'
        : 'List of doctors available for home visits and telemedicine consultations',
    url: `${baseUrl}/${locale}/doctors`,
    numberOfItems: doctors.length,
    itemListElement: doctors.slice(0, 20).map((doctor, index) => ({
      '@type': 'ListItem',
      position: (currentPage - 1) * 20 + index + 1,
      item: {
        '@type': 'Physician',
        name: doctor.doctorName,
        description: doctor.bio?.substring(0, 200) || doctor.professionalTitle,
        image: doctor.image.startsWith('http')
          ? doctor.image
          : `${baseUrl}/${doctor.image}`,
        url: `${baseUrl}/${locale}/doctors/${doctor.profileLink}`,
        medicalSpecialty: doctor.speciality,
        aggregateRating: doctor.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: doctor.rating,
              bestRating: 5,
            }
          : undefined,
      },
    })),
  };
}

/**
 * FAQ Page Schema
 * Helps appear in rich snippets
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Breadcrumb List Schema
 * Shows navigation path in search results
 */
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Website Schema
 * Main website representation
 */
export function generateWebsiteSchema(locale: string = 'en') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${config.api.baseUrl}#website`,
    url: config.api.baseUrl,
    name: 'Anees Health',
    description:
      locale === 'ar'
        ? 'منصة رائدة في مصر للرعاية الصحية المنزلية والتطبيب عن بعد'
        : "Egypt's leading home healthcare and telemedicine platform",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${config.api.baseUrl}/${locale}/doctors?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: locale === 'ar' ? 'ar-EG' : 'en-US',
  };
}

/**
 * Helper to render JSON-LD script tag
 */
export function renderStructuredData(schema: object) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Helper to serialize JSON-LD as string
 * For server-side rendering
 */
export function renderJsonLd(schema: object): string {
  return JSON.stringify(schema, null, 0);
}

/**
 * ContactPage Schema with ContactPoint
 * For contact us page
 */
export function generateContactPageSchema(locale: string = 'en') {
  const baseUrl = config.api.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${baseUrl}/${locale}/contact-us`,
    url: `${baseUrl}/${locale}/contact-us`,
    name: locale === 'ar' ? 'اتصل بنا' : 'Contact Us',
    description:
      locale === 'ar'
        ? 'تواصل مع فريق أنيس هيلث'
        : 'Get in touch with Anees Health team',
    mainEntity: {
      '@type': 'Organization',
      '@id': `${baseUrl}#organization`,
      name: 'Anees Health',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+20-1270558620',
          contactType: 'Customer Service',
          availableLanguage: ['English', 'Arabic'],
          areaServed: 'EG',
          hoursAvailable: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ],
            opens: '00:00',
            closes: '23:59',
          },
        },
      ],
    },
  };
}

/**
 * Article Schema for content pages
 * Helps AI models understand content hierarchy and authorship
 */
export function generateArticleSchema(
  article: {
    title: string;
    description: string;
    datePublished?: string;
    dateModified?: string;
    author?: string;
  },
  locale: string = 'en',
  url: string
) {
  const baseUrl = config.api.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url,
    datePublished: article.datePublished || new Date().toISOString(),
    dateModified: article.dateModified || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: article.author || 'Anees Health',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}#organization`,
      name: 'Anees Health',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logos/anees-health-logo.png`,
      },
    },
    inLanguage: locale === 'ar' ? 'ar-EG' : 'en-US',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}
