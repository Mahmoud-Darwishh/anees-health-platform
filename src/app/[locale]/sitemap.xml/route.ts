/**
 * Locale-specific sitemap for doctor profiles
 * Route: /[locale]/sitemap.xml
 * 
 * Generates XML sitemap with all doctor profile URLs
 * for the current locale
 */

import { MetadataRoute } from 'next';
import { getAllDoctorSlugs } from '@/lib/api/doctors';
import { config } from '@/lib/config';

interface SitemapParams {
  params: {
    locale: 'en' | 'ar';
  };
}

export default async function sitemap({
  params,
}: SitemapParams): Promise<MetadataRoute.Sitemap> {
  const { locale } = params;
  const baseUrl = config.api.baseUrl;
  const slugs = await getAllDoctorSlugs();

  // Generate sitemap entries for all doctors
  const doctorUrls: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${baseUrl}/${locale}/doctors/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Include main pages
  const mainPages: MetadataRoute.Sitemap = [
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
      priority: 0.9,
    },
    {
      url: `${baseUrl}/${locale}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${locale}/coverage`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  return [...mainPages, ...doctorUrls];
}
