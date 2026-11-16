import { FACILITIES, REGION_CENTROIDS, REGIONS, type Facility, type Region } from '../data/facilities';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RankedFacility {
  facility: Facility;
  km: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function rankFacilities(origin: GeoPoint, count = 3): RankedFacility[] {
  return FACILITIES.map((facility) => ({
    facility,
    km: distanceKm(origin, { lat: facility.lat, lng: facility.lng }),
  }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

export function nearestFacility(origin: GeoPoint): RankedFacility {
  return rankFacilities(origin, 1)[0];
}

/**
 * Which region a coordinate falls in, approximated as the nearest regional
 * centroid. Good enough to label a location and to pre-fill the region field;
 * it is not a legal boundary. Ties and border towns can be off by a region.
 */
export function regionForPoint(point: GeoPoint): Region {
  let best: Region = REGIONS[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const region of REGIONS) {
    const km = distanceKm(point, REGION_CENTROIDS[region]);
    if (km < bestKm) {
      bestKm = km;
      best = region;
    }
  }
  return best;
}

/** Someone who would rather tap a region than share GPS. */
export function regionOrigin(region: Region): GeoPoint {
  return REGION_CENTROIDS[region];
}

export function facilitiesInRegion(region: Region): Facility[] {
  return FACILITIES.filter((facility) => facility.region === region);
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
