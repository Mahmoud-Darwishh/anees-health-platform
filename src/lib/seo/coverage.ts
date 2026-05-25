/**
 * GeoJSON-driven coverage metadata for SEO/GEO.
 *
 * The live coverage file is the single source of truth for "where Anees
 * operates today" — it powers the public map, the address-coverage check,
 * AND the LocalBusiness.areaServed / Place schemas. Add a feature to the
 * GeoJSON and SEO automatically picks it up.
 *
 * Server-only (reads from the file system at build / request time).
 */

import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateSeoSlug } from '@/lib/utils/slug';

export interface CoverageAreaFeature {
  slug: string;
  name: string;
  nameAr: string;
  governorate: string;
  governorateAr: string;
  covered: boolean;
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
  /** Centroid (longitude, latitude) — approximate */
  centroid: { lng: number; lat: number };
}

const GEOJSON_PATH = path.join(
  process.cwd(),
  'public',
  'assets',
  'coverage',
  'anees-cover-areas.geojson'
);

let cache: CoverageAreaFeature[] | null = null;

interface RawGeoJsonFeature {
  type: 'Feature';
  properties: {
    name: string;
    name_ar: string;
    governorate: string;
    governorate_ar: string;
    covered?: boolean;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

function flattenRings(geom: RawGeoJsonFeature['geometry']): number[][] {
  if (geom.type === 'Polygon') {
    return (geom.coordinates as number[][][])[0] || [];
  }
  // MultiPolygon: concatenate every outer ring
  return ((geom.coordinates as number[][][][])
    .map((poly) => poly[0] || [])
    .flat());
}

function computeBboxAndCentroid(ring: number[][]): {
  bbox: [number, number, number, number];
  centroid: { lng: number; lat: number };
} {
  if (ring.length === 0) {
    return { bbox: [0, 0, 0, 0], centroid: { lng: 0, lat: 0 } };
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    sumLng += lng;
    sumLat += lat;
  }
  return {
    bbox: [minLng, minLat, maxLng, maxLat],
    centroid: { lng: sumLng / ring.length, lat: sumLat / ring.length },
  };
}

export async function getCoverageAreas(): Promise<CoverageAreaFeature[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(GEOJSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { features: RawGeoJsonFeature[] };
    cache = parsed.features
      .filter((f) => f.properties?.covered !== false)
      .map((f) => {
        const ring = flattenRings(f.geometry);
        const { bbox, centroid } = computeBboxAndCentroid(ring);
        return {
          slug: generateSeoSlug(f.properties.name),
          name: f.properties.name,
          nameAr: f.properties.name_ar,
          governorate: f.properties.governorate,
          governorateAr: f.properties.governorate_ar,
          covered: f.properties.covered ?? true,
          bbox,
          centroid,
        } satisfies CoverageAreaFeature;
      });
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

/**
 * Aggregated bounding box for ALL covered areas — useful for the global
 * `geo.position` / ICBM meta tags so they reflect where we actually
 * operate instead of a single hardcoded Cairo coordinate.
 */
export async function getCoverageOverview(): Promise<{
  centroid: { lng: number; lat: number };
  bbox: [number, number, number, number];
  governorates: string[];
  governoratesAr: string[];
}> {
  const areas = await getCoverageAreas();
  if (areas.length === 0) {
    return {
      centroid: { lng: 31.2357, lat: 30.0444 },
      bbox: [31.2357, 30.0444, 31.2357, 30.0444],
      governorates: ['Cairo'],
      governoratesAr: ['القاهرة'],
    };
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const a of areas) {
    if (a.bbox[0] < minLng) minLng = a.bbox[0];
    if (a.bbox[1] < minLat) minLat = a.bbox[1];
    if (a.bbox[2] > maxLng) maxLng = a.bbox[2];
    if (a.bbox[3] > maxLat) maxLat = a.bbox[3];
  }
  const govs = Array.from(new Set(areas.map((a) => a.governorate)));
  const govsAr = Array.from(new Set(areas.map((a) => a.governorateAr)));
  return {
    centroid: { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 },
    bbox: [minLng, minLat, maxLng, maxLat],
    governorates: govs,
    governoratesAr: govsAr,
  };
}
