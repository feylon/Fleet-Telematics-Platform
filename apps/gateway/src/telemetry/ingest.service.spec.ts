import { UnauthorizedException } from '@nestjs/common';
import { IngestService, normalizePing } from './ingest.service';
import { DeviceBinding } from './device-auth.service';

const binding: DeviceBinding = {
  deviceId: 'd1',
  organizationId: 'org1',
  vehicleId: 'veh1',
  imei: '860000000000001',
  tokenHash: 'hash',
  maxSpeedKmh: 90,
  plateNumber: '01A123BC',
};

const build = (resolved: DeviceBinding | null) => {
  const published: unknown[][] = [];
  const recorded: unknown[] = [];
  const service = new IngestService(
    { resolve: async () => resolved } as never,
    { publishTelemetry: async (messages: unknown[]) => { published.push(messages); } } as never,
    { record: async (message: unknown) => { recorded.push(message); return message; } } as never,
    { update: async () => undefined } as never,
    { set: async () => 'OK' } as never,
  );
  return { service, published, recorded };
};

describe('IngestService', () => {
  it('rejects unknown devices before publishing anything', async () => {
    const { service, published } = build(null);
    await expect(service.ingest('999', 'tok', [{ latitude: 41, longitude: 69, speed: 10 }])).rejects.toThrow(UnauthorizedException);
    expect(published).toHaveLength(0);
  });

  it('rejects missing credentials', async () => {
    const { service, published } = build(binding);
    await expect(service.ingest(undefined, undefined, [{ latitude: 41, longitude: 69, speed: 10 }])).rejects.toThrow(UnauthorizedException);
    expect(published).toHaveLength(0);
  });

  it('publishes normalized pings in chronological order and records the latest', async () => {
    const { service, published, recorded } = build(binding);
    const base = Date.now() - 60000;
    const result = await service.ingest(binding.imei, 'tok', [
      { latitude: 41, longitude: 69, speed: 10, timestamp: new Date(base + 5000).toISOString() },
      { latitude: 41.1, longitude: 69.1, speed: 20, timestamp: new Date(base).toISOString() },
    ]);
    expect(result.accepted).toBe(2);
    const batch = published[0] as Array<{ timestamp: string; vehicleId: string }>;
    expect(batch[0].timestamp < batch[1].timestamp).toBe(true);
    expect(batch[0].vehicleId).toBe('veh1');
    expect((recorded[0] as { speed: number }).speed).toBe(10);
  });
});

describe('normalizePing', () => {
  const now = new Date('2026-08-01T10:00:00Z');

  it('derives movement flags from speed when absent', () => {
    const ping = normalizePing(binding, { latitude: 41, longitude: 69, speed: 25 }, now);
    expect(ping.isMoving).toBe(true);
    expect(ping.ignitionOn).toBe(true);
    expect(ping.timestamp).toBe(now.toISOString());
  });

  it('falls back to server time when the device clock is far off', () => {
    const ping = normalizePing(binding, { latitude: 41, longitude: 69, speed: 0, timestamp: '2020-01-01T00:00:00Z' }, now);
    expect(ping.timestamp).toBe(now.toISOString());
  });
});
