import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { sha256Hex } from '@fleet/common';
import { Device, Vehicle } from '@fleet/database';
import { REDIS } from '../redis/redis.module';

export interface DeviceBinding {
  deviceId: string;
  organizationId: string;
  vehicleId: string;
  imei: string;
  tokenHash: string;
  maxSpeedKmh: number;
  plateNumber: string;
}

export const DEVICE_CACHE_PREFIX = 'device:';
const CACHE_TTL_SECONDS = 120;

@Injectable()
export class DeviceAuthService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async resolve(imei: string, token: string): Promise<DeviceBinding | null> {
    const binding = await this.load(imei);
    if (!binding) return null;
    if (binding.tokenHash !== sha256Hex(token)) return null;
    return binding;
  }

  async invalidate(imei: string): Promise<void> {
    await this.redis.del(`${DEVICE_CACHE_PREFIX}${imei}`);
  }

  private async load(imei: string): Promise<DeviceBinding | null> {
    const key = `${DEVICE_CACHE_PREFIX}${imei}`;
    const cached = await this.redis.get(key);
    if (cached) return cached === 'null' ? null : (JSON.parse(cached) as DeviceBinding);
    const device = await this.devices.findOne({ where: { imei } });
    if (!device || !device.isActive || !device.vehicleId) {
      await this.redis.set(key, 'null', 'EX', 15);
      return null;
    }
    const vehicle = await this.vehicles.findOne({ where: { id: device.vehicleId } });
    if (!vehicle) {
      await this.redis.set(key, 'null', 'EX', 15);
      return null;
    }
    const binding: DeviceBinding = {
      deviceId: device.id,
      organizationId: device.organizationId,
      vehicleId: device.vehicleId,
      imei: device.imei,
      tokenHash: device.tokenHash,
      maxSpeedKmh: vehicle.maxSpeedKmh,
      plateNumber: vehicle.plateNumber,
    };
    await this.redis.set(key, JSON.stringify(binding), 'EX', CACHE_TTL_SECONDS);
    return binding;
  }
}
