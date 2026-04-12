import { MetadataRoute } from 'next';
import { getAllDoctorSlugs } from '@/lib/api/doctors';
import { config } from '@/lib/config';

export default async function sitemapDoctors(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.api.baseUrl;
  const locales = config.locales.supported as string[];
  const slugs = await getAllDoctorSlugs();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const slug of slugs) {
      entries.push({
        url: `${baseUrl}/${locale}/doctors/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  return entries;
}
