import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { TelemetryMessage } from '@fleet/common';
import { Device } from '@fleet/database';
import { REDIS } from '../redis/redis.module';
import { DeviceAuthService, DeviceBinding } from './device-auth.service';
import { KafkaProducerService } from './kafka.producer';
import { PresenceService } from './presence.service';
import { TelemetryPingDto } from './telemetry.dto';

export interface IngestResult {
  accepted: number;
  vehicleId: string;
}

export const normalizePing = (binding: DeviceBinding, dto: TelemetryPingDto, now: Date): TelemetryMessage => {
  const deviceTime = dto.timestamp ? new Date(dto.timestamp) : now;
  const skewLimitMs = 6 * 3600 * 1000;
  const timestamp = Math.abs(deviceTime.getTime() - now.getTime()) > skewLimitMs ? now : deviceTime;
  const speed = Number(dto.speed.toFixed(2));
  return {
    organizationId: binding.organizationId,
    vehicleId: binding.vehicleId,
    imei: binding.imei,
    timestamp: timestamp.toISOString(),
    latitude: dto.latitude,
    longitude: dto.longitude,
    speed,
    altitude: dto.altitude ?? 0,
    heading: dto.heading ?? 0,
    fuelLevel: dto.fuelLevel ?? 0,
    engineTemp: dto.engineTemp ?? 0,
    ignitionOn: dto.ignitionOn ?? speed > 0,
    isMoving: dto.isMoving ?? speed > 3,
    sos: dto.sos ?? false,
  };
};

@Injectable()
export class IngestService {
  constructor(
    private readonly deviceAuth: DeviceAuthService,
    private readonly producer: KafkaProducerService,
    private readonly presence: PresenceService,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async ingest(imei: string | undefined, token: string | undefined, pings: TelemetryPingDto[]): Promise<IngestResult> {
    if (!imei || !token) throw new UnauthorizedException('Device credentials missing');
    const binding = await this.deviceAuth.resolve(imei, token);
    if (!binding) throw new UnauthorizedException('Unknown device or invalid token');
    const now = new Date();
    const messages = pings.map((dto) => normalizePing(binding, dto, now)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    await this.producer.publishTelemetry(messages);
    await this.presence.record(messages[messages.length - 1], now);
    await this.touchDevice(binding, now);
    return { accepted: messages.length, vehicleId: binding.vehicleId };
  }

  private async touchDevice(binding: DeviceBinding, now: Date): Promise<void> {
    const key = `device:seen:${binding.imei}`;
    const marked = await this.redis.set(key, '1', 'EX', 60, 'NX');
    if (marked === 'OK') await this.devices.update(binding.deviceId, { lastSeenAt: now });
  }
}
