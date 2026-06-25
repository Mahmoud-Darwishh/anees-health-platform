/**
 * Neighbourhood (area) catalog for local-SEO landing pages.
 *
 * The coverage GeoJSON (`anees-cover-areas.geojson`) is a single Greater-Cairo
 * polygon — it powers the map + the site-wide LocalBusiness.areaServed, but it
 * has no per-neighbourhood features. These are the well-known served districts
 * we publish dedicated "/areas/[area]" pages for (the highest local-intent
 * queries: "home nursing in Maadi", "doctor home visit New Cairo", etc.).
 *
 * Add a row here → the route, sitemap, and hub all pick it up automatically.
 */
import type { SupportedLocale } from './site';

interface AreaDef {
  slug: string;
  en: string;
  ar: string;
  govEn: string;
  govAr: string;
}

const AREAS: AreaDef[] = [
  { slug: 'maadi', en: 'Maadi', ar: 'المعادي', govEn: 'Cairo', govAr: 'القاهرة' },
  { slug: 'new-cairo', en: 'New Cairo', ar: 'القاهرة الجديدة', govEn: 'Cairo', govAr: 'القاهرة' },
  { slug: 'zamalek', en: 'Zamalek', ar: 'الزمالك', govEn: 'Cairo', govAr: 'القاهرة' },
  { slug: 'heliopolis', en: 'Heliopolis', ar: 'مصر الجديدة', govEn: 'Cairo', govAr: 'القاهرة' },
  { slug: 'nasr-city', en: 'Nasr City', ar: 'مدينة نصر', govEn: 'Cairo', govAr: 'القاهرة' },
  { slug: 'mohandessin', en: 'Mohandessin', ar: 'المهندسين', govEn: 'Giza', govAr: 'الجيزة' },
  { slug: 'dokki', en: 'Dokki', ar: 'الدقي', govEn: 'Giza', govAr: 'الجيزة' },
  { slug: 'sheikh-zayed', en: 'Sheikh Zayed', ar: 'الشيخ زايد', govEn: 'Giza', govAr: 'الجيزة' },
  { slug: '6th-october', en: '6th of October', ar: 'السادس من أكتوبر', govEn: 'Giza', govAr: 'الجيزة' },
  { slug: 'giza', en: 'Giza', ar: 'الجيزة', govEn: 'Giza', govAr: 'الجيزة' },
];

export interface AreaLanding {
  slug: string;
  name: string;
  governorate: string;
}

function localize(area: AreaDef, locale: SupportedLocale): AreaLanding {
  return {
    slug: area.slug,
    name: locale === 'ar' ? area.ar : area.en,
    governorate: locale === 'ar' ? area.govAr : area.govEn,
  };
}

export function getAllAreaSlugs(): string[] {
  return AREAS.map((a) => a.slug);
}

export function getArea(locale: SupportedLocale, slug: string): AreaLanding | null {
  const area = AREAS.find((a) => a.slug === slug);
  return area ? localize(area, locale) : null;
}

export function getAllAreas(locale: SupportedLocale): AreaLanding[] {
  return AREAS.map((a) => localize(a, locale));
}
