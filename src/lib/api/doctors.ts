/**
 * Server-side data access layer for doctors
 * Reads from PostgreSQL via Prisma — replaces JSON file loading
 */

import { unstable_cache } from 'next/cache';
import { Doctor } from '@/lib/models/doctor.types';
import { generateDoctorSlug } from '@/lib/utils/slug';
import { prisma } from '@/lib/db/prisma';
import type { Doctor as PrismaDoctor } from '@prisma/client';

// Cache tags. Call `revalidateTag(DOCTORS_CACHE_TAG)` from any admin
// mutation that edits the Doctor table to bust the cache immediately.
export const DOCTORS_CACHE_TAG = 'doctors';
const DOCTORS_CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Map a Prisma Doctor row to the Doctor interface for a given locale
 */
function mapDoctor(row: PrismaDoctor, locale: 'en' | 'ar'): Doctor {
  const isAr = locale === 'ar';
  return {
    id: row.id,
    image: row.image,
    rating: row.rating,
    speciality: isAr ? row.specialityAr : row.specialityEn,
    specialityColorClass: row.specialityColorClass,
    specialityTextClass: row.specialityTextClass,
    availabilityStatus: row.availabilityStatus,
    availabilityBadgeClass: row.availabilityBadgeClass,
    doctorName: isAr ? row.nameAr : row.nameEn,
    location: row.location,
    duration: row.duration,
    consultationFee: row.consultationFee,
    maxConsultationFee: row.maxConsultationFee,
    professionalTitle: isAr ? row.professionalTitleAr : row.professionalTitleEn,
    profileLink: `/doctors/${row.slug}`,
    bookingLink: '/booking',
    gender: row.gender,
    channels: row.channels as string[],
    languages: row.languages as string[],
    clinics: row.clinics as string[],
    experienceYears: row.experienceYears,
    bio: (isAr ? row.bioAr : row.bioEn) || '',
    certifications: (isAr ? row.certificationsAr : row.certificationsEn) as string[],
    education: (isAr ? row.educationAr : row.educationEn) as unknown as Doctor['education'],
    pricing: {
      telemedicine: row.priceTelemedicine,
      homeVisit: row.priceHomeVisit,
      clinicVisit: row.priceClinicVisit,
    },
    successRate: row.successRate,
    avgWaitTime: row.avgWaitTime,
    totalPatients: row.totalPatients,
    areaCoverage: row.areaCoverage as string[],
    clinicDetails: row.clinicDetails as unknown as Doctor['clinicDetails'],
    testimonials: row.testimonials as unknown as Doctor['testimonials'],
    externalProfiles: Array.isArray(row.externalProfiles)
      ? (row.externalProfiles as string[]).filter((u): u is string => typeof u === 'string')
      : [],
  };
}

/**
 * Get all active doctors for a given locale.
 *
 * Cached with `unstable_cache` keyed by locale. Bust with
 * `revalidateTag(DOCTORS_CACHE_TAG)` from admin mutations.
 */
export const getDoctors = (locale: 'en' | 'ar'): Promise<Doctor[]> =>
  unstable_cache(
    async (loc: 'en' | 'ar'): Promise<Doctor[]> => {
      const rows = await prisma.doctor.findMany({
        // isPublic gates consent to a public profile; isActive gates currently
        // practising. A doctor must satisfy BOTH to appear on any public surface.
        where: { isActive: true, isPublic: true },
        orderBy: { id: 'asc' },
      });
      return rows.map((row) => mapDoctor(row, loc));
    },
    ['doctors', locale],
    { tags: [DOCTORS_CACHE_TAG], revalidate: DOCTORS_CACHE_TTL_SECONDS },
  )(locale);

/**
 * Find a doctor by slug in a specific locale
 */
export async function getDoctorBySlug(slug: string, locale: 'en' | 'ar'): Promise<Doctor | null> {
  const row = await prisma.doctor.findUnique({ where: { slug } });
  // Treat an inactive OR non-public (unconsented) doctor as not-found so the
  // profile page emits robots:{index:false} + notFound(). Without this, a direct
  // hit to such a slug would still render a fully-indexable public profile
  // even though generateStaticParams + the sitemap already exclude it.
  if (!row || !row.isActive || !row.isPublic) return null;
  return mapDoctor(row, locale);
}

/**
 * Get all doctor slugs for static path generation
 */
export async function getAllDoctorSlugs(): Promise<string[]> {
  const rows = await prisma.doctor.findMany({
    // Only active + publicly-consented doctors are statically built / sitemapped.
    where: { isActive: true, isPublic: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/**
 * Get canonical slug by doctor id
 */
export async function getDoctorCanonicalSlugById(id: number): Promise<string | null> {
  const row = await prisma.doctor.findUnique({
    where: { id },
    select: { slug: true },
  });
  return row?.slug ?? null;
}

// Keep generateDoctorSlug accessible for pages that still use it
export { generateDoctorSlug };
