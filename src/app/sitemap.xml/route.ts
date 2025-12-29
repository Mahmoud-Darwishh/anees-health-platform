/**
 * Root sitemap index
 * Route: /sitemap.xml
 * 
 * Points to locale-specific sitemaps
 */

import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = config.api.baseUrl;
  const locales = config.locales.supported as string[];

  return locales.map((locale) => ({
    url: `${baseUrl}/${locale}/sitemap.xml`,
    lastModified: new Date(),
  }));
}
