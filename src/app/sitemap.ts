/**
 * Root sitemap
 * Route: /sitemap.xml
 * 
 * Generates XML sitemap with all pages and locales
 * Priority: Prominent doctors (specialists, featured) get higher priority
 */

import { MetadataRoute } from 'next';
import { getAllDoctorSlugs } from '@/lib/api/doctors';
import { getAllServiceLandingSlugs, getAllSpecialtyLandings } from '@/lib/seo/search-discovery';
import { getAllAreaSlugs } from '@/lib/seo/areas';
import { getAllGuideSlugs } from '@/lib/seo/guides';
import { config } from '@/lib/config';

// List of featured/prominent doctors for higher SEO priority
const PROMINENT_DOCTORS = [
  'mahmoud-darwish', // Geriatrics specialist
];

// Evaluated once per deployment (at module load), not per request — so re-crawls
// see a stable lastmod that refreshes on each deploy, instead of an always-"changed
// now" signal that search engines discount.
const LAST_MODIFIED = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.api.baseUrl;
  const locales = config.locales.supported as string[];
  const slugs = await getAllDoctorSlugs();
  const serviceSlugs = getAllServiceLandingSlugs();
  // Specialty slugs are derived from the English roster and are locale-stable.
  const specialtySlugs = (await getAllSpecialtyLandings('en')).map((s) => s.slug);
  const areaSlugs = getAllAreaSlugs();
  const guideSlugs = getAllGuideSlugs();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    // Main pages with priority for searchable content
    entries.push(
      {
        url: `${baseUrl}/${locale}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/${locale}/doctors`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'daily',
        priority: 0.95, // Increased for home visit doctor searches
      },
      {
        url: `${baseUrl}/${locale}/coverage`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      // Service + specialty hubs (high commercial intent)
      {
        url: `${baseUrl}/${locale}/services`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/${locale}/specialties`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.85,
      },
      {
        url: `${baseUrl}/${locale}/faq`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/${locale}/areas`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/${locale}/pricing`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.75,
      },
      {
        url: `${baseUrl}/${locale}/guides`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      // About pages
      {
        url: `${baseUrl}/${locale}/about-us`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      // Contact
      {
        url: `${baseUrl}/${locale}/contact-us`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      // Legal
      {
        url: `${baseUrl}/${locale}/privacy-policy`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/${locale}/terms-and-conditions`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.3,
      }
    );

    // Doctor profiles - with prominence for featured doctors
    for (const slug of slugs) {
      const isProminent = PROMINENT_DOCTORS.includes(slug);
      entries.push({
        url: `${baseUrl}/${locale}/doctors/${slug}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: isProminent ? 0.95 : 0.8, // Prominent doctors get higher priority
      });
    }

    // Service landing pages
    for (const slug of serviceSlugs) {
      entries.push({
        url: `${baseUrl}/${locale}/services/${slug}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }

    // Specialty landing pages
    for (const slug of specialtySlugs) {
      entries.push({
        url: `${baseUrl}/${locale}/specialties/${slug}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }

    // Area (neighbourhood) landing pages
    for (const slug of areaSlugs) {
      entries.push({
        url: `${baseUrl}/${locale}/areas/${slug}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }

    // Guides (editorial)
    for (const slug of guideSlugs) {
      entries.push({
        url: `${baseUrl}/${locale}/guides/${slug}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.65,
      });
    }
  }

  return entries;
}
