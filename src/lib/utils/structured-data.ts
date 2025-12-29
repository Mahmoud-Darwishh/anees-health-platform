/**
 * Schema.org structured data utilities
 * Generates JSON-LD for medical professionals
 */

import { PhysicianSchema } from '@/lib/models/doctor.types';
import type { Doctor } from '@/lib/models/doctor.types';
import { extractCity } from '@/lib/api/doctors';

/**
 * Generate Schema.org Physician structured data
 * Helps search engines understand doctor profiles
 * 
 * @param doctor - Doctor entity
 * @param locale - Current locale
 * @param url - Canonical URL of the profile
 * @returns JSON-LD structured data
 */
export function generatePhysicianSchema(
  doctor: Doctor,
  locale: 'en' | 'ar',
  url: string
): PhysicianSchema {
  const city = extractCity(doctor.location);
  const country = locale === 'ar' ? 'مصر' : 'Egypt';

  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.doctorName,
    description: doctor.bio,
    medicalSpecialty: doctor.speciality,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: country,
    },
    image: doctor.image.startsWith('http')
      ? doctor.image
      : `${url.split('/').slice(0, 3).join('/')}/${doctor.image}`,
    url,
  };
}

/**
 * Render JSON-LD script tag
 * Server-side only
 */
export function renderJsonLd(data: PhysicianSchema): string {
  return JSON.stringify(data, null, 0);
}
