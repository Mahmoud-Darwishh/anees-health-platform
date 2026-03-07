/**
 * Root sitemap
 * Route: /sitemap.xml
 * 
 * Generates XML sitemap with all pages and locales
 * Priority: Prominent doctors (specialists, featured) get higher priority
 */

import { MetadataRoute } from 'next';
import { getAllDoctorSlugs } from '@/lib/api/doctors';
import { config } from '@/lib/config';

// List of featured/prominent doctors for higher SEO priority
const PROMINENT_DOCTORS = [
  'mahmoud-darwish', // Geriatrics specialist
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.api.baseUrl;
  const locales = config.locales.supported as string[];
  const slugs = await getAllDoctorSlugs();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    // Main pages with priority for searchable content
    entries.push(
      {
        url: `${baseUrl}/${locale}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/${locale}/doctors`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.95, // Increased for home visit doctor searches
      },
      {
        url: `${baseUrl}/${locale}/services`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9, // Increased for elderly care & geriatrics searches
      },
      {
        url: `${baseUrl}/${locale}/coverage`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      // About pages
      {
        url: `${baseUrl}/${locale}/about-us`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      // Contact
      {
        url: `${baseUrl}/${locale}/contact-us`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      // Legal
      {
        url: `${baseUrl}/${locale}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/${locale}/terms-and-conditions`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      }
    );

    // Doctor profiles - with prominence for featured doctors
    for (const slug of slugs) {
      const isProminent = PROMINENT_DOCTORS.includes(slug);
      entries.push({
        url: `${baseUrl}/${locale}/doctors/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: isProminent ? 0.95 : 0.8, // Prominent doctors get higher priority
      });
    }
  }

  return entries;
}
