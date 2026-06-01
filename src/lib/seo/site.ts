/**
 * Single source of truth for all brand/site constants used by SEO helpers.
 *
 * Anything appearing in metadata, Open Graph, or JSON-LD (org name, phones,
 * social profiles, founder identities, founding year, default OG image)
 * should be read from this file — never inlined into a page or layout.
 */

import { config } from '@/lib/config';

const baseUrl = config.api.baseUrl;

export const site = {
  /** Canonical site origin (no trailing slash) */
  baseUrl,

  /** Brand */
  name: 'Anees Health',
  nameAr: 'أنيس هيلث',
  shortName: 'Anees',
  shortNameAr: 'أنيس',

  /** Founding */
  foundedYear: 2024,

  /** OG / share image (1200x630) */
  defaultOgImage: `${baseUrl}/assets/img/about-img1.png`,
  /** Logo image — used by Organization.logo (must be reachable, square-ish) */
  logoImage: `${baseUrl}/assets/img/footer-logo.png`,

  /** Contact */
  phones: {
    primary: '+201270558620',
    secondary: '+201096169459',
    whatsapp: '+201055164595',
  },
  email: 'info@aneeshealth.com',

  /** Address — operational HQ in Cairo */
  address: {
    streetAddress: 'Cairo',
    addressLocality: 'Cairo',
    addressRegion: 'Cairo Governorate',
    postalCode: '11511',
    addressCountry: 'EG',
  },

  /** Approximate geo centroid of the served region (Cairo) */
  geo: {
    latitude: 30.0444,
    longitude: 31.2357,
  },

  /** Bilingual labels reused in metadata + breadcrumbs */
  labels: {
    home: { en: 'Home', ar: 'الرئيسية' },
    doctors: { en: 'Doctors', ar: 'الأطباء' },
    services: { en: 'Services', ar: 'الخدمات' },
    specialties: { en: 'Specialties', ar: 'التخصصات' },
    booking: { en: 'Book a Home Visit', ar: 'احجز زيارة منزلية' },
    coverage: { en: 'Coverage', ar: 'مناطق التغطية' },
    about: { en: 'About Us', ar: 'من نحن' },
    contact: { en: 'Contact Us', ar: 'تواصل معنا' },
  },

  /** Founders — referenced by Organization.founder */
  founders: [
    {
      name: 'Dr. Mahmoud Darwish',
      nameAr: 'الدكتور محمود درويش',
      slug: 'mahmoud-darwish',
      jobTitle: { en: 'Co-Founder', ar: 'مؤسس مشارك' },
    },
    {
      name: 'Dr. Ahmed Oraby',
      nameAr: 'الدكتور أحمد عرابي',
      slug: 'dr-ahmed-oraby',
      jobTitle: { en: 'Co-Founder', ar: 'مؤسس مشارك' },
    },
  ],

  /** Social profiles — sameAs targets (string[]) */
  socialProfiles: config.brand.socialProfiles as readonly string[],

  /** Default locale + supported locales */
  defaultLocale: 'en' as const,
  supportedLocales: ['en', 'ar'] as const,
} as const;

export type SupportedLocale = (typeof site.supportedLocales)[number];

/**
 * Map a supported locale to its BCP-47 tag used in `inLanguage`, `hreflang`,
 * and Open Graph `locale`.
 */
export function bcp47(locale: string): 'en-US' | 'ar-EG' {
  return locale === 'ar' ? 'ar-EG' : 'en-US';
}

/** Convenience getter for translated brand label */
export function brandLabel(locale: string): string {
  return locale === 'ar' ? site.nameAr : site.name;
}

/**
 * Build hreflang `languages` map for a given path.
 * Always emits en, ar, and an explicit `x-default` (pointing to EN).
 *
 * Pass either the locale-prefixed path (`/en/doctors`) or the bare path
 * (`/doctors`). Both work — the leading locale is normalised away.
 */
export function buildHreflangMap(path: string): Record<string, string> {
  const bare = path.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
  const normalize = (p: string) => (p === '/' ? '' : p);
  return {
    'en-US': `${site.baseUrl}/en${normalize(bare)}`,
    'ar-EG': `${site.baseUrl}/ar${normalize(bare)}`,
    'x-default': `${site.baseUrl}/en${normalize(bare)}`,
  };
}

/** Build a fully-qualified canonical URL for a given locale-prefixed path. */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${site.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
