import { deriveStatus, LastPing } from './status';

const now = new Date('2026-08-01T10:00:00Z');

const ping = (overrides: Partial<LastPing>): LastPing => ({
  vehicleId: 'v',
  organizationId: 'o',
  imei: '1',
  timestamp: now.toISOString(),
  latitude: 41,
  longitude: 69,
  speed: 0,
  heading: 0,
  altitude: 0,
  fuelLevel: 50,
  engineTemp: 80,
  ignitionOn: true,
  isMoving: false,
  sos: false,
  sosAt: null,
  receivedAt: now.toISOString(),
  ...overrides,
});

describe('deriveStatus', () => {
  it('is OFFLINE without a ping', () => {
    expect(deriveStatus(null, now)).toBe('OFFLINE');
  });

  it('is OFFLINE after five minutes of silence', () => {
    expect(deriveStatus(ping({ receivedAt: new Date(now.getTime() - 6 * 60000).toISOString(), speed: 60 }), now)).toBe('OFFLINE');
  });

  it('is MOVING when speed above threshold', () => {
    expect(deriveStatus(ping({ speed: 40 }), now)).toBe('MOVING');
  });

  it('is MOVING when flagged moving at low speed', () => {
    expect(deriveStatus(ping({ speed: 1, isMoving: true }), now)).toBe('MOVING');
  });

  it('is IDLE when stationary and recent', () => {
    expect(deriveStatus(ping({ speed: 0 }), now)).toBe('IDLE');
  });

  it('is EMERGENCY on sos even when stale', () => {
    expect(deriveStatus(ping({ sos: true, receivedAt: new Date(now.getTime() - 60 * 60000).toISOString() }), now)).toBe('EMERGENCY');
  });

  it('stays EMERGENCY for ten minutes after the sos ping', () => {
    const sosAt = new Date(now.getTime() - 9 * 60000).toISOString();
    expect(deriveStatus(ping({ sos: false, sosAt, speed: 20 }), now)).toBe('EMERGENCY');
    const oldSos = new Date(now.getTime() - 11 * 60000).toISOString();
    expect(deriveStatus(ping({ sos: false, sosAt: oldSos, speed: 20 }), now)).toBe('MOVING');
  });
});
