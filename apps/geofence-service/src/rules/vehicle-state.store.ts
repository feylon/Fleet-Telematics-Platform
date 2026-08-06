import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../common/redis.provider';
import { VehicleState } from './rule-engine';

export const STATE_PREFIX = 'geofence:state:';
const STATE_TTL_SECONDS = 3 * 24 * 3600;

@Injectable()
export class VehicleStateStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get(vehicleId: string): Promise<VehicleState | null> {
    const raw = await this.redis.get(`${STATE_PREFIX}${vehicleId}`);
    return raw ? (JSON.parse(raw) as VehicleState) : null;
  }

  async set(vehicleId: string, state: VehicleState): Promise<void> {
    await this.redis.set(`${STATE_PREFIX}${vehicleId}`, JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
  }

  async clear(vehicleId: string): Promise<void> {
    await this.redis.del(`${STATE_PREFIX}${vehicleId}`);
  }
}
