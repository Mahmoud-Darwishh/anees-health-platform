/**
 * Coverage utilities for checking if a location is within service areas
 * Uses point-in-polygon algorithm for geographic coverage checks
 */

export interface CoverageArea {
  type: 'Feature';
  properties: {
    name: string;
    name_ar: string;
    governorate: string;
    governorate_ar: string;
    covered: boolean;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface CoverageData {
  type: 'FeatureCollection';
  features: CoverageArea[];
}

export interface CoverageCheckResult {
  covered: boolean;
  area?: {
    name: string;
    name_ar: string;
    governorate: string;
    governorate_ar: string;
  };
  message: string;
}

/**
 * Tolerance distance in degrees (approximately 2-3 km)
 * 0.02 degrees ≈ 2.2 km at the equator
 */
const COVERAGE_TOLERANCE_DEGREES = 0.02;

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 */
function pointInPolygon(
  point: [number, number],
  polygon: number[][][]
): boolean {
  const [x, y] = point;
  const coords = polygon[0]; // First ring (outer boundary)
  
  let inside = false;
  
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];
    const yi = coords[i][1];
    const xj = coords[j][0];
    const yj = coords[j][1];
    
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Calculate minimum distance from a point to a polygon's edges
 */
function distanceToPolygon(
  point: [number, number],
  polygon: number[][][]
): number {
  const [px, py] = point;
  const coords = polygon[0];
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const x1 = coords[i][0];
    const y1 = coords[i][1];
    const x2 = coords[j][0];
    const y2 = coords[j][1];

    // Calculate distance from point to line segment
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

/**
 * Check if a point is within or near a polygon (with tolerance)
 */
function isWithinCoverageArea(
  point: [number, number],
  polygon: number[][][]
): boolean {
  // First check if point is inside polygon
  if (pointInPolygon(point, polygon)) {
    return true;
  }

  // If not inside, check if within tolerance distance
  const distance = distanceToPolygon(point, polygon);
  return distance <= COVERAGE_TOLERANCE_DEGREES;
}

/**
 * Check if coordinates are within any covered area (with tolerance zone)
 */
export function checkCoverageByCoordinates(
  latitude: number,
  longitude: number,
  coverageData: CoverageData
): CoverageCheckResult {
  const point: [number, number] = [longitude, latitude];
  
  for (const feature of coverageData.features) {
    if (!feature.properties.covered) continue;
    
    if (isWithinCoverageArea(point, feature.geometry.coordinates)) {
      return {
        covered: true,
        area: {
          name: feature.properties.name,
          name_ar: feature.properties.name_ar,
          governorate: feature.properties.governorate,
          governorate_ar: feature.properties.governorate_ar,
        },
        message: 'Location is within our service area',
      };
    }
  }
  
  return {
    covered: false,
    message: 'Location is not currently covered by our services',
  };
}

/**
 * Check coverage by area/zone name
 */
export function checkCoverageByZone(
  zoneName: string,
  coverageData: CoverageData
): CoverageCheckResult {
  const normalizedZone = zoneName.toLowerCase().trim();
  
  const matchingArea = coverageData.features.find(
    (feature) =>
      feature.properties.covered &&
      (feature.properties.name.toLowerCase().includes(normalizedZone) ||
        feature.properties.name_ar.includes(zoneName.trim()))
  );
  
  if (matchingArea) {
    return {
      covered: true,
      area: {
        name: matchingArea.properties.name,
        name_ar: matchingArea.properties.name_ar,
        governorate: matchingArea.properties.governorate,
        governorate_ar: matchingArea.properties.governorate_ar,
      },
      message: 'Zone is within our service area',
    };
  }
  
  return {
    covered: false,
    message: 'Zone is not currently covered by our services',
  };
}

/**
 * Get all covered zones
 */
export function getCoveredZones(coverageData: CoverageData): Array<{
  name: string;
  name_ar: string;
  governorate: string;
  governorate_ar: string;
}> {
  return coverageData.features
    .filter((feature) => feature.properties.covered)
    .map((feature) => ({
      name: feature.properties.name,
      name_ar: feature.properties.name_ar,
      governorate: feature.properties.governorate,
      governorate_ar: feature.properties.governorate_ar,
    }));
}
