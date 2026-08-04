import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { hostname } from 'node:os';
import { Consumer, Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { AlertMessage, createKafka, FleetEventMessage, KafkaConsumerGroups, KafkaTopics, PlatformEnv, TelemetryMessage } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { REDIS } from '../redis/redis.module';
import { LiveGateway } from './live.gateway';
import { PresenceService } from './presence.service';
import { deriveStatus } from './status';
import { DeviceAuthService } from './device-auth.service';

export const RECENT_ALERTS_PREFIX = 'org:alerts:';
const RECENT_ALERTS_LIMIT = 200;

@Injectable()
export class LiveConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveConsumer.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(
    @Inject(ENV) env: PlatformEnv,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly live: LiveGateway,
    private readonly presence: PresenceService,
    private readonly deviceAuth: DeviceAuthService,
  ) {
    this.kafka = createKafka(env, '-live');
    this.consumer = this.kafka.consumer({ groupId: `${KafkaConsumerGroups.gatewayLive}-${hostname()}`, sessionTimeout: 30000, allowAutoTopicCreation: false });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: [KafkaTopics.telemetryRaw, KafkaTopics.fleetAlerts, KafkaTopics.fleetEvents], fromBeginning: false });
    await this.consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          if (topic === KafkaTopics.telemetryRaw) await this.onTelemetry(payload as TelemetryMessage);
          else if (topic === KafkaTopics.fleetAlerts) await this.onAlert(payload as AlertMessage);
          else if (topic === KafkaTopics.fleetEvents) await this.onEvent(payload as FleetEventMessage);
        } catch (error) {
          this.logger.warn(`live consumer skipped message: ${(error as Error).message}`);
        }
      },
    });
    this.logger.log('live consumer running');
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async onTelemetry(message: TelemetryMessage): Promise<void> {
    const ping = (await this.presence.get(message.vehicleId)) ?? (await this.presence.record(message, new Date()));
    this.live.broadcastTelemetry({ ...ping, status: deriveStatus(ping, new Date()) });
  }

  private async onAlert(alert: AlertMessage): Promise<void> {
    const key = `${RECENT_ALERTS_PREFIX}${alert.organizationId}`;
    await this.redis.multi().lpush(key, JSON.stringify(alert)).ltrim(key, 0, RECENT_ALERTS_LIMIT - 1).expire(key, 7 * 24 * 3600).exec();
    this.live.broadcastAlert(alert);
  }

  private async onEvent(event: FleetEventMessage): Promise<void> {
    if (event.event === 'device.changed' && typeof event.payload?.imei === 'string') await this.deviceAuth.invalidate(event.payload.imei);
    if (event.event === 'vehicle.changed' && event.payload?.deleted === true) await this.presence.forget(event.organizationId, event.entityId);
    this.live.broadcastEvent(event);
  }
}
