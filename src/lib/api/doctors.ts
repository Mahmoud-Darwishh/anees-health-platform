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
 * Read-through accessor for doctor data.
 * Always loads latest JSON so content edits are reflected without server restart.
 */
function getDoctorsData(): LocalizedDoctorData {
  return loadDoctorsData();
}

/**
 * Build canonical slug map keyed by doctor id (derived from English names)
 * Guarantees stable slugs across locales
 */
function getCanonicalSlugMap(): Map<number, string> {
  const data = getDoctorsData();
  return new Map(data.en.map((doc) => [doc.id, generateDoctorSlug(doc.doctorName)]));
}

/**
 * Resolve canonical slug for a doctor id
 * @param id - Doctor identifier
 * @returns Canonical slug or null
 */
function getCanonicalSlugById(id: number): string | null {
  const canonicalSlugById = getCanonicalSlugMap();
  return canonicalSlugById.get(id) || null;
}

/**
 * Public canonical slug resolver by doctor id
 * Used by SEO pages to create locale-safe links to doctor profile pages.
 */
export async function getDoctorCanonicalSlugById(id: number): Promise<string | null> {
  return getCanonicalSlugById(id);
}

/**
 * Get all doctors for a specific locale
 * @param locale - Language code
 * @returns Array of doctors
 */
export async function getDoctors(locale: 'en' | 'ar'): Promise<Doctor[]> {
  const doctorsData = getDoctorsData();
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
