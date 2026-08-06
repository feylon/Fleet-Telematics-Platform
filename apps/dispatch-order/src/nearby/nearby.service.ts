import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { haversineKm } from '@fleet/common';
import { REDIS } from '../common/redis.provider';
import { FleetClient } from '../orders/fleet.client';

interface LastPing {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  receivedAt: string;
  sos: boolean;
  isMoving: boolean;
}

export interface NearbyCandidate {
  vehicleId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  status: string;
}

export const rankNearby = (origin: { latitude: number; longitude: number }, pings: LastPing[], radiusKm: number, limit: number, now: Date): NearbyCandidate[] =>
  pings
    .map((ping) => {
      const ageMs = now.getTime() - new Date(ping.receivedAt).getTime();
      const status = ping.sos ? 'EMERGENCY' : ageMs > 5 * 60000 ? 'OFFLINE' : ping.isMoving || ping.speed > 3 ? 'MOVING' : 'IDLE';
      return { vehicleId: ping.vehicleId, latitude: ping.latitude, longitude: ping.longitude, distanceKm: Number(haversineKm(origin, ping).toFixed(3)), status };
    })
    .filter((candidate) => candidate.distanceKm <= radiusKm && candidate.status !== 'OFFLINE' && candidate.status !== 'EMERGENCY')
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

@Injectable()
export class NearbyService {
  constructor(@Inject(REDIS) private readonly redis: Redis, private readonly fleet: FleetClient) {}

  async find(organizationId: string, latitude: number, longitude: number, radiusKm: number, limit: number) {
    const ids = await this.redis.smembers(`org:vehicles:${organizationId}`);
    if (ids.length === 0) return { items: [] };
    const raws = await this.redis.mget(ids.map((id) => `vehicle:last:${id}`));
    const pings = raws.filter((raw): raw is string => Boolean(raw)).map((raw) => JSON.parse(raw) as LastPing);
    const ranked = rankNearby({ latitude, longitude }, pings, radiusKm > 0 ? radiusKm : 25, limit > 0 ? limit : 10, new Date());
    const vehicles = await this.fleet.vehicleMany(organizationId, ranked.map((candidate) => candidate.vehicleId));
    const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    return {
      items: ranked
        .filter((candidate) => byId.get(candidate.vehicleId)?.status === 'ACTIVE')
        .map((candidate) => ({ ...candidate, plateNumber: byId.get(candidate.vehicleId)?.plateNumber ?? '', driverName: byId.get(candidate.vehicleId)?.driverName ?? '' })),
    };
  }
}
