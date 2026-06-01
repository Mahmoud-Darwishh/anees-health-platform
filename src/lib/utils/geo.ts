import 'server-only';

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function toGeoPoint(latitude: number, longitude: number): GeoPoint | null {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

function parseCoordinatePair(value: string): GeoPoint | null {
  const match = value.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return toGeoPoint(latitude, longitude);
}

export function parseCoordinatesFromMapUrl(urlValue: string): GeoPoint | null {
  const raw = urlValue.trim();
  if (!raw) {
    return null;
  }

  const direct = parseCoordinatePair(raw);
  if (direct) {
    return direct;
  }

  try {
    const parsedUrl = new URL(raw);

    const fromQ = parsedUrl.searchParams.get('q') ?? parsedUrl.searchParams.get('query') ?? parsedUrl.searchParams.get('ll');
    if (fromQ) {
      const point = parseCoordinatePair(fromQ);
      if (point) {
        return point;
      }
    }

    const atMatch = parsedUrl.pathname.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
    if (atMatch) {
      const latitude = Number(atMatch[1]);
      const longitude = Number(atMatch[2]);
      const point = toGeoPoint(latitude, longitude);
      if (point) {
        return point;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function haversineDistanceMeters(origin: GeoPoint, destination: GeoPoint): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(destination.latitude - origin.latitude);
  const deltaLongitude = toRadians(destination.longitude - origin.longitude);
  const latitude1 = toRadians(origin.latitude);
  const latitude2 = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2) * Math.cos(latitude1) * Math.cos(latitude2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}
