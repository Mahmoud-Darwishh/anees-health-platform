/**
 * Centralised JSON-LD generators for Anees Health.
 *
 * Replaces the older `src/lib/utils/structured-data.ts` (which still ships
 * as a thin re-export shim for legacy imports). All output is plain
 * JSON-serialisable — render with {@link renderJsonLd} for XSS-safe
 * inlining into `<script type="application/ld+json">`.
 *
 * Positioning: home-visit-first home healthcare in Egypt. Telemedicine is
 * one channel, not the headline.
 */

import { site, bcp47, absoluteUrl, brandLabel, type SupportedLocale } from './site';
import type { Doctor } from '@/lib/models/doctor.types';
import type { BookingPriceMap } from '@/lib/models/booking.types';
import type { CoverageAreaFeature } from './coverage';
import type { FaqItem } from './faqs';

/* ──────────────────────────── Helpers ──────────────────────────── */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/**
 * Serialise a JSON-LD object into a string safe to inline inside a
 * `<script>` tag. Escapes only the dangerous sequences `<`, `>`, `&`,
 * `\u2028`, `\u2029` — never the data itself.
 */
export function renderJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function localised<T>(locale: string, en: T, ar: T): T {
  return locale === 'ar' ? ar : en;
}

function orgId(): string {
  return `${site.baseUrl}/#organization`;
}

function localBusinessId(): string {
  return `${site.baseUrl}/#localbusiness`;
}

function websiteId(): string {
  return `${site.baseUrl}/#website`;
}

/* ─────────────────────────── Organization ─────────────────────── */

export function organizationSchema(locale: SupportedLocale = 'en'): JsonValue {
  const name = brandLabel(locale);
  const alternateName = locale === 'ar' ? site.name : site.nameAr;
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'MedicalOrganization'],
    '@id': orgId(),
    name,
    alternateName,
    legalName: site.name,
    url: site.baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: site.logoImage,
      caption: name,
    },
    image: site.defaultOgImage,
    foundingDate: `${site.foundedYear}-01-01`,
    description: localised(
      locale,
      'Anees Health is an Egyptian home healthcare platform offering licensed doctor home visits, home nursing, home physiotherapy, lab tests at home, and chronic-disease care coordination across Greater Cairo and beyond.',
      'أنيس هيلث منصة رعاية صحية منزلية في مصر تقدم زيارات أطباء منزلية وتمريضاً منزلياً وعلاجاً طبيعياً منزلياً وتحاليل في المنزل وتنسيقاً لرعاية الأمراض المزمنة عبر القاهرة الكبرى ومحيطها.'
    ),
    medicalSpecialty: [
      'PrimaryCare',
      'Geriatric',
      'Physiotherapy',
      'Nursing',
      'Pediatric',
      'InternalMedicine',
    ],
    knowsLanguage: ['en', 'ar'],
    areaServed: {
      '@type': 'Country',
      name: 'Egypt',
      sameAs: 'https://www.wikidata.org/wiki/Q79',
    },
    address: {
      '@type': 'PostalAddress',
      ...site.address,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: site.phones.primary,
        email: site.email,
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
      {
        '@type': 'ContactPoint',
        contactType: 'emergency',
        telephone: site.phones.secondary,
        availableLanguage: ['English', 'Arabic'],
        areaServed: 'EG',
      },
    ],
    sameAs: site.socialProfiles.filter((u): u is string => Boolean(u)),
    founder: site.founders.map((f) => ({
      '@type': 'Person',
      name: locale === 'ar' ? f.nameAr : f.name,
      jobTitle: f.jobTitle[locale === 'ar' ? 'ar' : 'en'],
      url: `${site.baseUrl}/${locale}/doctors/${f.slug}`,
    })),
  };
}

/* ─────────────────────────── LocalBusiness ────────────────────── */

export function localBusinessSchema(
  locale: SupportedLocale,
  areas: CoverageAreaFeature[]
): JsonValue {
  const areaServed = areas.length > 0
    ? areas.map((a) => ({
        '@type': 'AdministrativeArea',
        name: locale === 'ar' ? a.nameAr : a.name,
        containedInPlace: {
          '@type': 'AdministrativeArea',
          name: locale === 'ar' ? a.governorateAr : a.governorate,
          addressCountry: 'EG',
        },
      }))
    : [
        {
          '@type': 'AdministrativeArea',
          name: locale === 'ar' ? 'القاهرة الكبرى' : 'Greater Cairo',
          containedInPlace: { '@type': 'Country', name: 'Egypt' },
        },
      ];

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'MedicalBusiness', 'MedicalOrganization'],
    '@id': localBusinessId(),
    name: brandLabel(locale),
    url: site.baseUrl,
    image: site.defaultOgImage,
    logo: site.logoImage,
    telephone: site.phones.primary,
    email: site.email,
    parentOrganization: { '@id': orgId() },
    address: {
      '@type': 'PostalAddress',
      ...site.address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    areaServed,
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
    priceRange: 'EGP 100–10,000',
    currenciesAccepted: 'EGP',
    paymentAccepted: 'Cash, Credit Card, Online (Kashier)',
    knowsLanguage: ['en', 'ar'],
  };
}

/* ───────────────────────────── WebSite ─────────────────────────── */

export function websiteSchema(locale: SupportedLocale): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(),
    url: `${site.baseUrl}/${locale}`,
    name: brandLabel(locale),
    inLanguage: bcp47(locale),
    publisher: { '@id': orgId() },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.baseUrl}/${locale}/doctors?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/* ──────────────────────────── Breadcrumb ───────────────────────── */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : absoluteUrl(item.url),
    })),
  };
}

/* ────────────────────────────── FAQPage ─────────────────────────── */

export function faqPageSchema(faqs: FaqItem[]): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

/* ─────────────────────────────── HowTo ─────────────────────────── */

export function howToBookingSchema(locale: SupportedLocale): JsonValue {
  const steps = locale === 'ar'
    ? [
        { name: 'اختر الخدمة', text: 'حدد نوع الزيارة المنزلية (طبيب، تمريض، علاج طبيعي، تحاليل).' },
        { name: 'حدد الموعد', text: 'اختر تاريخ ووقت الزيارة المناسبين لك.' },
        { name: 'أدخل بيانات المريض', text: 'أدخل العنوان وبيانات الاتصال للمريض.' },
        { name: 'أكد الحجز', text: 'ادفع إلكترونياً عبر كاشير أو ادفع للكادر الطبي عند الوصول.' },
        { name: 'تأكيد المنسق', text: 'يتولى منسق أنيس تأكيد الموعد وتعيين الكادر المناسب.' },
      ]
    : [
        { name: 'Choose the service', text: 'Pick the home visit you need (doctor, nurse, physiotherapy, lab tests).' },
        { name: 'Pick a slot', text: 'Choose a date and time that works for you.' },
        { name: 'Patient details', text: 'Enter the patient address and contact info.' },
        { name: 'Confirm booking', text: 'Pay online via Kashier or pay the clinician on arrival.' },
        { name: 'Coordinator confirmation', text: 'The Anees coordinator confirms the slot and assigns the right clinician.' },
    ];

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: locale === 'ar' ? 'كيف تحجز زيارة منزلية على أنيس هيلث' : 'How to book a home visit on Anees Health',
    description: locale === 'ar'
      ? 'خطوات حجز زيارة منزلية لطبيب أو ممرض أو متخصص علاج طبيعي عبر منصة أنيس.'
      : 'Steps to book a home visit with an Anees doctor, nurse, or physiotherapist.',
    totalTime: 'PT3M',
    inLanguage: bcp47(locale),
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/* ─────────────────────────── Physician ─────────────────────────── */

export function physicianSchema(
  locale: SupportedLocale,
  doctor: Doctor,
  slug: string
): JsonValue {
  const url = `${site.baseUrl}/${locale}/doctors/${slug}`;
  const channels = doctor.channels?.map((c) => c.toLowerCase()) ?? [];
  const offersHomeVisit = channels.some((c) => c.includes('home') || c.includes('منزل'));
  const offersTelemedicine = channels.some((c) => c.includes('tele') || c.includes('بعد'));

  const availableServices: JsonValue[] = [];
  if (offersHomeVisit) {
    availableServices.push({
      '@type': 'MedicalProcedure',
      name: locale === 'ar' ? 'زيارة طبيب منزلية' : 'Doctor home visit',
      procedureType: 'https://schema.org/TherapeuticProcedure',
    });
  }
  if (offersTelemedicine) {
    availableServices.push({
      '@type': 'MedicalProcedure',
      name: locale === 'ar' ? 'استشارة طبية عن بُعد' : 'Telemedicine consultation',
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': url,
    name: doctor.doctorName,
    description: doctor.bio,
    image: doctor.image?.startsWith('http') ? doctor.image : absoluteUrl(doctor.image || ''),
    url,
    gender: doctor.gender,
    knowsLanguage: doctor.languages,
    medicalSpecialty: doctor.speciality,
    jobTitle: doctor.professionalTitle,
    worksFor: { '@id': orgId() },
    memberOf: { '@id': orgId() },
    address: {
      '@type': 'PostalAddress',
      addressLocality: doctor.location || 'Cairo',
      addressCountry: 'EG',
    },
    availableService: availableServices.length > 0 ? availableServices : undefined,
    alumniOf: doctor.education?.map((e) => ({
      '@type': 'EducationalOrganization',
      name: e.university,
    })),
    hasCredential: doctor.certifications?.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c,
    })),
    yearsOfExperience: doctor.experienceYears || undefined,
  };
}

export function physiciansItemListSchema<T extends Doctor>(
  locale: SupportedLocale,
  doctors: T[],
  slugFor: (d: T) => string
): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'ar' ? 'أطباء أنيس هيلث' : 'Anees Health doctors',
    numberOfItems: doctors.length,
    itemListElement: doctors.map((d, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${site.baseUrl}/${locale}/doctors/${slugFor(d)}`,
      item: {
        '@type': 'Physician',
        name: d.doctorName,
        medicalSpecialty: d.speciality,
        image: d.image,
        url: `${site.baseUrl}/${locale}/doctors/${slugFor(d)}`,
      },
    })),
  };
}

/* ──────────────────────── MedicalProcedure ─────────────────────── */

export function medicalProcedureSchema(args: {
  locale: SupportedLocale;
  slug: string;
  name: string;
  description: string;
  priceEgp?: number;
  procedureType?: string;
  bodyLocation?: string;
}): JsonValue {
  const url = `${site.baseUrl}/${args.locale}/services/${args.slug}`;
  const base: { [key: string]: JsonValue | undefined } = {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    '@id': url,
    name: args.name,
    description: args.description,
    url,
    procedureType: args.procedureType || 'https://schema.org/TherapeuticProcedure',
    bodyLocation: args.bodyLocation,
    inLanguage: bcp47(args.locale),
    provider: { '@id': orgId() },
  };
  if (args.priceEgp !== undefined) {
    base.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'EGP',
      price: args.priceEgp,
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Country', name: 'Egypt' },
    };
  }
  return base;
}

/* ──────────────── Services index — Service + AggregateOffer ───── */

export interface ServiceOfferInput {
  code: string;
  name: string;
  description: string;
  landingSlug: string | null;
  priceEgp?: number;
}

export function servicesItemListSchema(
  locale: SupportedLocale,
  services: ServiceOfferInput[]
): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'ar' ? 'خدمات الرعاية الصحية المنزلية لأنيس هيلث' : 'Anees Health home healthcare services',
    description: locale === 'ar'
      ? 'قائمة الخدمات الصحية المنزلية المتاحة في مصر عبر أنيس هيلث.'
      : 'Catalog of home healthcare services Anees Health provides in Egypt.',
    numberOfItems: services.length,
    itemListElement: services.map((s, idx) => {
      const url = s.landingSlug ? `${site.baseUrl}/${locale}/services/${s.landingSlug}` : `${site.baseUrl}/${locale}/services`;
      const item: { [key: string]: JsonValue | undefined } = {
        '@type': 'MedicalProcedure',
        '@id': url,
        name: s.name,
        description: s.description,
        url,
        provider: { '@id': orgId() },
      };
      if (s.priceEgp !== undefined) {
        item.offers = {
          '@type': 'Offer',
          url,
          priceCurrency: 'EGP',
          price: s.priceEgp,
          availability: 'https://schema.org/InStock',
        };
      }
      return {
        '@type': 'ListItem',
        position: idx + 1,
        item,
      } as JsonValue;
    }),
  };
}

export function aggregateOfferSchema(
  locale: SupportedLocale,
  prices: BookingPriceMap
): JsonValue {
  const values = Object.values(prices).filter((v) => v > 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    name: locale === 'ar' ? 'أسعار خدمات أنيس هيلث' : 'Anees Health service pricing',
    priceCurrency: 'EGP',
    lowPrice: min,
    highPrice: max,
    offerCount: values.length,
    seller: { '@id': orgId() },
    areaServed: { '@type': 'Country', name: 'Egypt' },
  };
}

/* ────────────────────────────── Article ─────────────────────────── */

export function articleSchema(
  data: {
    title: string;
    description: string;
    datePublished: string;
    dateModified: string;
    author: string;
  },
  locale: SupportedLocale,
  url: string
): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    inLanguage: bcp47(locale),
    author: { '@type': 'Organization', name: data.author },
    publisher: { '@id': orgId() },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

/* ────────────────────────── ContactPage ─────────────────────────── */

export function contactPageSchema(locale: SupportedLocale): JsonValue {
  const url = `${site.baseUrl}/${locale}/contact-us`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': url,
    url,
    name: localised(locale, 'Contact Anees Health', 'تواصل مع أنيس هيلث'),
    inLanguage: bcp47(locale),
    about: { '@id': orgId() },
    mainEntity: { '@id': orgId() },
  };
}

/* ─────────────────────────── Coverage Place ─────────────────────── */

export function coveragePlaceSchema(
  locale: SupportedLocale,
  areas: CoverageAreaFeature[]
): JsonValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    '@id': `${site.baseUrl}/${locale}/coverage`,
    name: locale === 'ar' ? 'مناطق تغطية أنيس هيلث في مصر' : 'Anees Health coverage areas in Egypt',
    description: locale === 'ar'
      ? 'المناطق المغطاة بزيارات أنيس هيلث المنزلية في مصر.'
      : 'Areas where Anees Health home visits operate in Egypt.',
    containedInPlace: { '@type': 'Country', name: 'Egypt' },
    hasMap: `${site.baseUrl}/${locale}/coverage`,
    geo: {
      '@type': 'GeoShape',
      addressCountry: 'EG',
    },
    additionalProperty: areas.map((a) => ({
      '@type': 'PropertyValue',
      name: locale === 'ar' ? a.nameAr : a.name,
      value: locale === 'ar' ? a.governorateAr : a.governorate,
    })),
  };
}

/* ──────────────────────── Specialty (MedicalSpecialty) ──────────── */

export function medicalSpecialtySchema(args: {
  locale: SupportedLocale;
  slug: string;
  name: string;
  description: string;
}): JsonValue {
  const url = `${site.baseUrl}/${args.locale}/specialties/${args.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalSpecialty',
    '@id': url,
    name: args.name,
    description: args.description,
    url,
    relevantSpecialty: args.name,
    recognizingAuthority: { '@id': orgId() },
  };
}

/* ────────────────────────── WebPage (per route) ─────────────────── */

export function webPageSchema(args: {
  locale: SupportedLocale;
  path: string;
  name: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
}): JsonValue {
  const url = `${site.baseUrl}${args.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: args.name,
    description: args.description,
    inLanguage: bcp47(args.locale),
    isPartOf: { '@id': websiteId() },
    about: { '@id': orgId() },
    breadcrumb: args.breadcrumbs ? breadcrumbSchema(args.breadcrumbs) : undefined,
  };
}

/* ──────────────────────── DefinedTerm (glossary) ────────────────── */

export function definedTermSetSchema(args: {
  locale: SupportedLocale;
  path: string;
  name: string;
  description: string;
  terms: { slug: string; term: string; definition: string }[];
}): JsonValue {
  const url = `${site.baseUrl}${args.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': url,
    url,
    name: args.name,
    description: args.description,
    inLanguage: bcp47(args.locale),
    hasDefinedTerm: args.terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
      url: `${url}/${t.slug}`,
    })),
  };
}

export function definedTermSchema(args: {
  locale: SupportedLocale;
  setPath: string;
  setName: string;
  slug: string;
  term: string;
  definition: string;
}): JsonValue {
  const setUrl = `${site.baseUrl}${args.setPath}`;
  const url = `${setUrl}/${args.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': url,
    url,
    name: args.term,
    description: args.definition,
    inLanguage: bcp47(args.locale),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': setUrl,
      name: args.setName,
    },
  };
}

/* ──────────────────────── MedicalWebPage (health content) ───────── */

/**
 * Health-content page schema (condition / treatment / prevention pages).
 * Per schema.org medical-types best practice: tag the medical `aspect`
 * (e.g. 'Treatment', 'Prevention') and a patient `audience`.
 */
export function medicalWebPageSchema(args: {
  locale: SupportedLocale;
  path: string;
  name: string;
  description: string;
  aspect?: string;
  breadcrumbs?: BreadcrumbItem[];
}): JsonValue {
  const url = `${site.baseUrl}${args.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    '@id': url,
    url,
    name: args.name,
    description: args.description,
    inLanguage: bcp47(args.locale),
    aspect: args.aspect,
    audience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    isPartOf: { '@id': websiteId() },
    about: { '@id': orgId() },
    breadcrumb: args.breadcrumbs ? breadcrumbSchema(args.breadcrumbs) : undefined,
  };
}
