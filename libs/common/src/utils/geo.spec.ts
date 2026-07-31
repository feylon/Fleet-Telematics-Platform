import { haversineKm, pointInPolygon, distanceToPolylineKm, bearingDegrees } from './geo';

const square: [number, number][] = [
  [69.2, 41.3],
  [69.3, 41.3],
  [69.3, 41.4],
  [69.2, 41.4],
  [69.2, 41.3],
];

describe('haversineKm', () => {
  it('returns zero for identical points', () => {
    expect(haversineKm({ latitude: 41.3, longitude: 69.2 }, { latitude: 41.3, longitude: 69.2 })).toBe(0);
  });

  it('measures Tashkent to Samarkand close to 270 km', () => {
    const km = haversineKm({ latitude: 41.2995, longitude: 69.2401 }, { latitude: 39.6542, longitude: 66.9597 });
    expect(km).toBeGreaterThan(260);
    expect(km).toBeLessThan(280);
  });
});

describe('pointInPolygon', () => {
  it('detects a point strictly inside', () => {
    expect(pointInPolygon({ latitude: 41.35, longitude: 69.25 }, square)).toBe(true);
  });

  it('detects a point outside', () => {
    expect(pointInPolygon({ latitude: 41.5, longitude: 69.25 }, square)).toBe(false);
  });

  it('treats a vertex as inside', () => {
    expect(pointInPolygon({ latitude: 41.3, longitude: 69.2 }, square)).toBe(true);
  });

  it('treats a point on an edge as inside', () => {
    expect(pointInPolygon({ latitude: 41.3, longitude: 69.25 }, square)).toBe(true);
  });

  it('returns false for a degenerate ring', () => {
    expect(pointInPolygon({ latitude: 41.3, longitude: 69.25 }, [[69.2, 41.3]])).toBe(false);
  });
});

describe('distanceToPolylineKm', () => {
  const line: [number, number][] = [
    [69.2, 41.3],
    [69.3, 41.3],
  ];

  it('is zero on the line', () => {
    expect(distanceToPolylineKm({ latitude: 41.3, longitude: 69.25 }, line)).toBeLessThan(0.001);
  });

  it('measures perpendicular offset roughly', () => {
    const km = distanceToPolylineKm({ latitude: 41.31, longitude: 69.25 }, line);
    expect(km).toBeGreaterThan(1.0);
    expect(km).toBeLessThan(1.2);
  });

  it('returns infinity for an empty line', () => {
    expect(distanceToPolylineKm({ latitude: 41.31, longitude: 69.25 }, [])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('bearingDegrees', () => {
  it('points north when moving to a higher latitude', () => {
    const bearing = bearingDegrees({ latitude: 41.3, longitude: 69.2 }, { latitude: 41.4, longitude: 69.2 });
    expect(Math.round(bearing)).toBe(0);
  });

  it('points east when moving to a higher longitude', () => {
    const bearing = bearingDegrees({ latitude: 41.3, longitude: 69.2 }, { latitude: 41.3, longitude: 69.3 });
    expect(Math.round(bearing)).toBe(90);
  });
});
