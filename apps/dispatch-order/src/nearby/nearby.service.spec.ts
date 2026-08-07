import { rankNearby } from './nearby.service';

const now = new Date('2026-08-05T10:00:00Z');
const ping = (vehicleId: string, latitude: number, longitude: number, extra: Partial<{ speed: number; receivedAt: string; sos: boolean; isMoving: boolean }> = {}) => ({
  vehicleId,
  latitude,
  longitude,
  speed: 0,
  receivedAt: now.toISOString(),
  sos: false,
  isMoving: false,
  ...extra,
});

describe('rankNearby', () => {
  it('sorts by distance and drops offline, emergency and out-of-radius vehicles', () => {
    const result = rankNearby({ latitude: 41.3, longitude: 69.2 }, [
      ping('far', 42.0, 69.2),
      ping('near', 41.31, 69.2),
      ping('mid', 41.35, 69.2, { speed: 40 }),
      ping('offline', 41.301, 69.2, { receivedAt: new Date(now.getTime() - 10 * 60000).toISOString() }),
      ping('sos', 41.302, 69.2, { sos: true }),
    ], 25, 10, now);
    expect(result.map((r) => r.vehicleId)).toEqual(['near', 'mid']);
    expect(result[1].status).toBe('MOVING');
  });

  it('honours the limit', () => {
    const result = rankNearby({ latitude: 41.3, longitude: 69.2 }, [ping('a', 41.31, 69.2), ping('b', 41.32, 69.2)], 25, 1, now);
    expect(result).toHaveLength(1);
  });
});
