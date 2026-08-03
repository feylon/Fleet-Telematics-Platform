import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { TelemetryMessage } from '@fleet/common';
import { REDIS } from '../redis/redis.module';
import { LastPing } from './status';

export const LAST_PING_PREFIX = 'vehicle:last:';
export const ORG_VEHICLES_PREFIX = 'org:vehicles:';
const LAST_PING_TTL_SECONDS = 7 * 24 * 3600;

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async record(message: TelemetryMessage, receivedAt: Date): Promise<LastPing> {
    const key = `${LAST_PING_PREFIX}${message.vehicleId}`;
    const previous = await this.redis.get(key);
    const previousPing = previous ? (JSON.parse(previous) as LastPing) : null;
    const ping: LastPing = {
      vehicleId: message.vehicleId,
      organizationId: message.organizationId,
      imei: message.imei,
      timestamp: message.timestamp,
      latitude: message.latitude,
      longitude: message.longitude,
      speed: message.speed,
      heading: message.heading,
      altitude: message.altitude,
      fuelLevel: message.fuelLevel,
      engineTemp: message.engineTemp,
      ignitionOn: message.ignitionOn,
      isMoving: message.isMoving,
      sos: message.sos,
      sosAt: message.sos ? message.timestamp : previousPing?.sosAt ?? null,
      receivedAt: receivedAt.toISOString(),
    };
    await this.redis
      .multi()
      .set(key, JSON.stringify(ping), 'EX', LAST_PING_TTL_SECONDS)
      .sadd(`${ORG_VEHICLES_PREFIX}${message.organizationId}`, message.vehicleId)
      .exec();
    return ping;
  }

  async get(vehicleId: string): Promise<LastPing | null> {
    const raw = await this.redis.get(`${LAST_PING_PREFIX}${vehicleId}`);
    return raw ? (JSON.parse(raw) as LastPing) : null;
  }

  async listForOrganization(organizationId: string): Promise<LastPing[]> {
    const ids = await this.redis.smembers(`${ORG_VEHICLES_PREFIX}${organizationId}`);
    if (ids.length === 0) return [];
    const raws = await this.redis.mget(ids.map((id) => `${LAST_PING_PREFIX}${id}`));
    return raws.filter((raw): raw is string => Boolean(raw)).map((raw) => JSON.parse(raw) as LastPing);
  }

  async forget(organizationId: string, vehicleId: string): Promise<void> {
    await this.redis.multi().del(`${LAST_PING_PREFIX}${vehicleId}`).srem(`${ORG_VEHICLES_PREFIX}${organizationId}`, vehicleId).exec();
  }
}
