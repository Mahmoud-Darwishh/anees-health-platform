/**
 * @deprecated Use `@/lib/seo/jsonld` directly.
 *
 * Thin backward-compat shim. Every export below routes to the centralized
 * SEO module in `src/lib/seo/`. New code MUST import from
 * `@/lib/seo/jsonld`. This shim exists only so that existing callers
 * continue to compile while we migrate them.
 */

import {
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
  breadcrumbSchema,
  faqPageSchema,
  physicianSchema as newPhysicianSchema,
  physiciansItemListSchema,
  contactPageSchema,
  articleSchema,
  medicalProcedureSchema,
  renderJsonLd as newRenderJsonLd,
  type BreadcrumbItem,
} from '@/lib/seo/jsonld';
import type { SupportedLocale } from '@/lib/seo/site';
import type { Doctor } from '@/lib/models/doctor.types';
import type { FaqItem } from '@/lib/seo/faqs';

function asLocale(locale: string | undefined): SupportedLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

export interface StructuredDataProps {
  type: string;
  data: Record<string, unknown>;
}

export const renderJsonLd = newRenderJsonLd;

/** Alias kept for legacy callers. */
export function renderStructuredData(schema: object): string {
  return newRenderJsonLd(schema);
}

export function generateOrganizationSchema(locale: string = 'en') {
  return organizationSchema(asLocale(locale));
}

/**
 * Legacy: LocalBusiness took no arguments. The new helper requires the
 * coverage-area list — for the shim we pass an empty list, which yields a
 * minimal LocalBusiness without per-area entries. Layouts should migrate
 * to `localBusinessSchema(locale, await getCoverageAreas())`.
 */
export function generateLocalBusinessSchema(locale: string = 'en') {
  return localBusinessSchema(asLocale(locale), []);
}

export function generateWebsiteSchema(locale: string = 'en') {
  return websiteSchema(asLocale(locale));
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return breadcrumbSchema(items);
}

export function generateFAQSchema(faqs: FaqItem[]) {
  return faqPageSchema(faqs);
}

export function generateContactPageSchema(locale: string = 'en') {
  return contactPageSchema(asLocale(locale));
}

export function generateArticleSchema(
  data: {
    title: string;
    description: string;
    datePublished: string;
    dateModified: string;
    author: string;
  },
  locale: string,
  url: string
) {
  return articleSchema(data, asLocale(locale), url);
}

export function generatePhysicianSchema(
  doctor: Doctor,
  locale: string = 'en',
  canonicalUrl: string
) {
  // Derive slug from the canonical URL (last path segment)
  const slug = canonicalUrl.replace(/\/$/, '').split('/').pop() || '';
  return newPhysicianSchema(asLocale(locale), doctor, slug);
}

/** Legacy simple Physician (listing entries). Routed to MedicalProcedure-free Physician minimal block. */
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
  const minimal: Doctor = {
    id: 0,
    image: doctor.image || '',
    rating: 0,
    speciality: doctor.specialty,
    specialityColorClass: '',
    specialityTextClass: '',
    availabilityStatus: '',
    availabilityBadgeClass: '',
    doctorName: doctor.name,
    location: 'Cairo',
    duration: '',
    consultationFee: '',
    maxConsultationFee: '',
    professionalTitle: '',
    profileLink: '',
    bookingLink: '',
    gender: '',
    channels: [],
    languages: [],
    clinics: [],
    experienceYears: 0,
    bio: doctor.bio,
    certifications: [],
    education: [],
    pricing: { telemedicine: '', homeVisit: '', clinicVisit: '' },
    successRate: '',
    avgWaitTime: '',
    totalPatients: '',
    areaCoverage: [],
    clinicDetails: [],
    testimonials: [],
  };
  return newPhysicianSchema(asLocale(locale), minimal, doctor.slug);
}

export function generateMedicalServiceSchema(
  service: { name: string; description: string; slug: string },
  locale: string = 'en'
) {
  return medicalProcedureSchema({
    locale: asLocale(locale),
    slug: service.slug,
    name: service.name,
    description: service.description,
  });
}

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
  locale: string = 'en'
) {
  // Adapt the partial shape to full Doctor type expected by the new helper.
  const adapted: Doctor[] = doctors.map((d, idx) => ({
    id: idx,
    image: d.image,
    rating: d.rating ?? 0,
    speciality: d.speciality,
    specialityColorClass: '',
    specialityTextClass: '',
    availabilityStatus: '',
    availabilityBadgeClass: '',
    doctorName: d.doctorName,
    location: '',
    duration: '',
    consultationFee: '',
    maxConsultationFee: '',
    professionalTitle: d.professionalTitle,
    profileLink: d.profileLink,
    bookingLink: '',
    gender: '',
    channels: [],
    languages: [],
    clinics: [],
    experienceYears: 0,
    bio: d.bio ?? '',
    certifications: [],
    education: [],
    pricing: { telemedicine: '', homeVisit: '', clinicVisit: '' },
    successRate: '',
    avgWaitTime: '',
    totalPatients: '',
    areaCoverage: [],
    clinicDetails: [],
    testimonials: [],
  }));
  return physiciansItemListSchema(asLocale(locale), adapted, (d) => {
    // profileLink is like /en/doctors/<slug> — extract the slug
    return d.profileLink.replace(/\/$/, '').split('/').pop() || '';
  });
}
