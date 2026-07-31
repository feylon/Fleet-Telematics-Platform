export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371.0088;
const EDGE_EPSILON = 1e-9;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const haversineKm = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const bearingDegrees = (from: GeoPoint, to: GeoPoint): number => {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const onSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): boolean => {
  const squaredLength = (bx - ax) ** 2 + (by - ay) ** 2;
  if (squaredLength < EDGE_EPSILON) return Math.abs(px - ax) < EDGE_EPSILON && Math.abs(py - ay) < EDGE_EPSILON;
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (Math.abs(cross) > EDGE_EPSILON) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  if (dot < -EDGE_EPSILON) return false;
  return dot <= squaredLength + EDGE_EPSILON;
};

export const pointInPolygon = (point: GeoPoint, ring: LngLat[]): boolean => {
  if (ring.length < 3) return false;
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (onSegment(x, y, xi, yi, xj, yj)) return true;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const pointInAnyRing = (point: GeoPoint, rings: LngLat[][]): boolean => {
  if (rings.length === 0) return false;
  if (!pointInPolygon(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInPolygon(point, rings[i])) return false;
  }
  return true;
};

const projectToSegmentKm = (p: GeoPoint, a: LngLat, b: LngLat): number => {
  const latScale = Math.cos(toRadians(p.latitude));
  const ax = a[0] * latScale;
  const ay = a[1];
  const bx = b[0] * latScale;
  const by = b[1];
  const px = p.longitude * latScale;
  const py = p.latitude;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const closest: GeoPoint = { longitude: (ax + t * dx) / latScale, latitude: ay + t * dy };
  return haversineKm(p, closest);
};

export const distanceToPolylineKm = (point: GeoPoint, line: LngLat[]): number => {
  if (line.length === 0) return Number.POSITIVE_INFINITY;
  if (line.length === 1) return haversineKm(point, { longitude: line[0][0], latitude: line[0][1] });
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    best = Math.min(best, projectToSegmentKm(point, line[i], line[i + 1]));
  }
  return best;
};
