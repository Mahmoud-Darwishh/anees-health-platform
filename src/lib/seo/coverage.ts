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
