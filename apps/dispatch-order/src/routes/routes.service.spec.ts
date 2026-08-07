import { polylineDistanceKm } from './routes.service';

describe('polylineDistanceKm', () => {
  it('sums segment lengths', () => {
    const km = polylineDistanceKm([
      [69.2, 41.3],
      [69.3, 41.3],
      [69.3, 41.4],
    ]);
    expect(km).toBeGreaterThan(19);
    expect(km).toBeLessThan(20);
  });

  it('is zero for a single point', () => {
    expect(polylineDistanceKm([[69.2, 41.3]])).toBe(0);
  });
});
