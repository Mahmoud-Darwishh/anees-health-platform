/**
 * Server-side data access layer for doctors
 * Reads from PostgreSQL via Prisma — replaces JSON file loading
 */

import { unstable_cache } from 'next/cache';
import { Doctor, LocalizedDoctorData } from '@/lib/models/doctor.types';
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
        where: { isActive: true },
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
  if (!row) return null;
  return mapDoctor(row, locale);
}

/**
 * Get all doctor slugs for static path generation
 */
export async function getAllDoctorSlugs(): Promise<string[]> {
  const rows = await prisma.doctor.findMany({
    where: { isActive: true },
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

/**
 * Extract city from location string
 */
export function extractCity(location: string): string {
  return location.split(',')[0]?.trim() || location;
}

// ── Legacy compatibility ──────────────────────────────────────────────────────
// getDoctorsData() was used internally. Not exported — kept for reference only.
// The JSON files in doctorgrid/ are no longer the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use getDoctors() — reads from DB
 */
export async function getLocalizedDoctorData(): Promise<LocalizedDoctorData> {
  const [en, ar] = await Promise.all([getDoctors('en'), getDoctors('ar')]);
  return { en, ar };
}

// Keep generateDoctorSlug accessible for pages that still use it
export { generateDoctorSlug };
