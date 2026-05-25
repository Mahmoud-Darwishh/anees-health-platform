/**
 * @deprecated Use `@/lib/seo/metadata` directly.
 *
 * This file is a thin backward-compat shim — every export below routes to
 * the centralized SEO module in `src/lib/seo/`. New code MUST import from
 * `@/lib/seo/metadata`. This shim exists only so that existing callers
 * continue to compile while we migrate them.
 */

import type { Metadata } from 'next';
import {
  buildHomeMetadata,
  buildDoctorsMetadata,
  buildServicesMetadata,
  buildCoverageMetadata,
  buildDoctorProfileMetadata,
  buildAboutMetadata,
  buildContactMetadata,
  buildLegalMetadata,
} from '@/lib/seo/metadata';
import { buildHreflangMap, site, bcp47, type SupportedLocale } from '@/lib/seo/site';

function asLocale(locale: string): SupportedLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

export interface PageMetadataProps {
  title: string;
  description: string;
  keywords?: string;
  locale: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}

/**
 * Generic page metadata builder — preserved for the few callers that still
 * use it directly. Prefer the named builders below or the new helpers in
 * `@/lib/seo/metadata`.
 */
export function generatePageMetadata({
  title,
  description,
  keywords,
  locale,
  path,
  image,
  noIndex,
}: PageMetadataProps): Metadata {
  const canonical = `${site.baseUrl}${path}`;
  const ogImage = image || site.defaultOgImage;
  return {
    title,
    description,
    keywords: keywords ? keywords.split(',').map((k) => k.trim()) : undefined,
    alternates: {
      canonical,
      languages: buildHreflangMap(path),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Anees Health',
      locale: bcp47(asLocale(locale)),
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

export function generateHomeMetadata(locale: string): Metadata {
  return buildHomeMetadata(asLocale(locale));
}

export function generateDoctorsMetadata(locale: string): Metadata {
  return buildDoctorsMetadata(asLocale(locale));
}

export function generateServicesMetadata(locale: string): Metadata {
  return buildServicesMetadata(asLocale(locale));
}

export function generateCoverageMetadata(locale: string): Metadata {
  return buildCoverageMetadata(asLocale(locale));
}

export function generateAboutMetadata(locale: string): Metadata {
  return buildAboutMetadata(asLocale(locale));
}

export function generateContactMetadata(locale: string): Metadata {
  return buildContactMetadata(asLocale(locale));
}

export function generatePrivacyMetadata(locale: string): Metadata {
  return buildLegalMetadata({ locale: asLocale(locale), kind: 'privacy' });
}

export function generateTermsMetadata(locale: string): Metadata {
  return buildLegalMetadata({ locale: asLocale(locale), kind: 'terms' });
}

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
  return buildDoctorProfileMetadata({
    locale: asLocale(locale),
    slug,
    name: doctor.doctorName,
    speciality: doctor.speciality,
    bio: doctor.bio,
    image: doctor.image,
  });
}

export function generateLanguageAlternates(currentPath: string) {
  return Object.entries(buildHreflangMap(currentPath))
    .filter(([k]) => k !== 'x-default')
    .map(([hrefLang, href]) => ({ hrefLang, href }));
}
