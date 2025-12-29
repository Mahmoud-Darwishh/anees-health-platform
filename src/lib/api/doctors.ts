/**
 * Server-side data access layer for doctors
 * Strict typing, locale-aware, production-ready
 */

import { Doctor, LocalizedDoctorData } from '@/lib/models/doctor.types';
import { generateDoctorSlug } from '@/lib/utils/slug';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load doctor data from JSON files
 * Cache in memory for performance
 */
function loadDoctorsData(): LocalizedDoctorData {
  try {
    const basePath = join(process.cwd(), 'src', 'components', 'doctors', 'doctorgrid');
    
    const enPath = join(basePath, 'doctors.en.json');
    const arPath = join(basePath, 'doctors.ar.json');
    
    const enData = JSON.parse(readFileSync(enPath, 'utf-8')) as Doctor[];
    const arData = JSON.parse(readFileSync(arPath, 'utf-8')) as Doctor[];
    
    return {
      en: Array.isArray(enData) ? enData : [],
      ar: Array.isArray(arData) ? arData : [],
    };
  } catch (error) {
    console.error('Failed to load doctors data:', error);
    return {
      en: [],
      ar: [],
    };
  }
}

/**
 * In-memory cache of doctors data
 * Future: Replace with Prisma/database queries
 */
const doctorsData: LocalizedDoctorData = loadDoctorsData();

/**
 * Canonical slug map keyed by doctor id (derived from English names)
 * Guarantees stable slugs across locales
 */
const canonicalSlugById: Map<number, string> = new Map(
  doctorsData.en.map((doc) => [doc.id, generateDoctorSlug(doc.doctorName)])
);

/**
 * Resolve canonical slug for a doctor id
 * @param id - Doctor identifier
 * @returns Canonical slug or null
 */
function getCanonicalSlugById(id: number): string | null {
  return canonicalSlugById.get(id) || null;
}

/**
 * Get all doctors for a specific locale
 * @param locale - Language code
 * @returns Array of doctors
 */
export async function getDoctors(locale: 'en' | 'ar'): Promise<Doctor[]> {
  const doctors = doctorsData[locale];
  
  if (!Array.isArray(doctors)) {
    console.error(`Doctors data for locale '${locale}' is not an array:`, doctors);
    return [];
  }
  
  return doctors;
}

/**
 * Find a doctor by slug in a specific locale
 * 
 * Lookup strategy:
 * 1. Generate slug from each doctor's name in the target locale
 * 2. Match against the requested slug
 * 3. Return doctor if found
 * 
 * @param slug - URL-safe doctor identifier (e.g., "mohamed-farwiez")
 * @param locale - Target locale
 * @returns Doctor or null
 */
export async function getDoctorBySlug(
  slug: string,
  locale: 'en' | 'ar'
): Promise<Doctor | null> {
  const englishDoctors = await getDoctors('en');

  // 1) Try canonical slug from English dataset (stable across locales)
  const canonicalMatch = englishDoctors.find(
    (doc) => generateDoctorSlug(doc.doctorName) === slug
  );

  if (canonicalMatch) {
    if (locale === 'en') {
      return canonicalMatch;
    }

    const localizedDoctors = await getDoctors(locale);
    const localizedById = localizedDoctors.find((doc) => doc.id === canonicalMatch.id);

    return localizedById || canonicalMatch;
  }

  // 2) Fallback: try matching within the requested locale (defensive)
  const localizedDoctors = await getDoctors(locale);
  const fallbackMatch = localizedDoctors.find(
    (doc) => generateDoctorSlug(doc.doctorName) === slug
  );

  return fallbackMatch || null;
}

/**
 * Get all doctor slugs for static path generation
 * Returns slugs from English names (stable across locales)
 * 
 * @returns Array of unique slugs
 */
export async function getAllDoctorSlugs(): Promise<string[]> {
  const doctors = await getDoctors('en');
  const slugs = doctors.map((doc) => generateDoctorSlug(doc.doctorName));
  
  // Ensure uniqueness
  return Array.from(new Set(slugs));
}

/**
 * Extract city from location string
 * @param location - Location string (e.g., "Cairo, Egypt")
 * @returns City name
 */
export function extractCity(location: string): string {
  return location.split(',')[0]?.trim() || location;
}
