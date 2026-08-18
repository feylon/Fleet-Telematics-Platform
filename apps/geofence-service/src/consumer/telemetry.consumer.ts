import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Consumer } from 'kafkajs';
import { createKafka, FleetEventMessage, KafkaConsumerGroups, KafkaTopics, PlatformEnv, TelemetryMessage } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { emptyState, evaluate } from '../rules/rule-engine';
import { GeofenceCache } from '../rules/geofence-cache';
import { VehicleCache } from '../rules/vehicle-cache';
import { RouteCache } from '../rules/route-cache';
import { VehicleStateStore } from '../rules/vehicle-state.store';
import { FleetEventsProducer } from '../alerts/fleet-events.producer';
import { isUrgent, NOTIFICATIONS_QUEUE, NotificationJob } from '../notifications/notifications.queue';

@Injectable()
export class TelemetryConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryConsumer.name);
  private readonly consumer: Consumer;
  private readonly eventsConsumer: Consumer;
  private readonly timezoneOffsetMinutes: number;
  private processed = 0;
  private emitted = 0;

  constructor(
    @Inject(ENV) private readonly env: PlatformEnv,
    private readonly geofences: GeofenceCache,
    private readonly vehicles: VehicleCache,
    private readonly routes: RouteCache,
    private readonly states: VehicleStateStore,
    private readonly producer: FleetEventsProducer,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notifications: Queue<NotificationJob>,
  ) {
    const kafka = createKafka(env);
    this.consumer = kafka.consumer({ groupId: KafkaConsumerGroups.geofenceSafety, sessionTimeout: 45000, allowAutoTopicCreation: false });
    this.eventsConsumer = kafka.consumer({ groupId: KafkaConsumerGroups.geofenceEvents, allowAutoTopicCreation: false });
    this.timezoneOffsetMinutes = Number.parseInt(process.env.TZ_OFFSET_MINUTES ?? '300', 10);
  }

  async onModuleInit(): Promise<void> {
    await this.eventsConsumer.connect();
    await this.eventsConsumer.subscribe({ topic: KafkaTopics.fleetEvents, fromBeginning: false });
    await this.eventsConsumer.run({ eachMessage: async ({ message }) => this.onEvent(message.value?.toString()) });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: KafkaTopics.telemetryRaw, fromBeginning: false });
    await this.consumer.run({
      partitionsConsumedConcurrently: 4,
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        let ping: TelemetryMessage;
        try {
          ping = JSON.parse(message.value.toString()) as TelemetryMessage;
        } catch (error) {
          this.logger.warn(`malformed telemetry skipped: ${(error as Error).message}`);
          return;
        }
        await this.onTelemetry(ping);
      },
    });
    this.logger.log('geofence safety consumer running');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.consumer.disconnect(), this.eventsConsumer.disconnect()]);
  }

  stats() {
    return { processed: this.processed, alertsEmitted: this.emitted };
  }

  private async onTelemetry(ping: TelemetryMessage): Promise<void> {
    if (!ping.vehicleId || !ping.organizationId) return;
    const [geofences, vehicle, route, previous] = await Promise.all([
      this.geofences.forOrganization(ping.organizationId),
      this.vehicles.forVehicle(ping.vehicleId),
      this.routes.forVehicle(ping.organizationId, ping.vehicleId),
      this.states.get(ping.vehicleId),
    ]);
    if (previous?.lastTimestamp && new Date(ping.timestamp).getTime() < new Date(previous.lastTimestamp).getTime()) return;
    const result = evaluate(ping, previous ?? emptyState(), { geofences, vehicle, route, now: new Date(), timezoneOffsetMinutes: this.timezoneOffsetMinutes });
    if (result.alerts.length > 0) {
      await this.producer.publishAlerts(result.alerts);
      const urgent = result.alerts.filter(isUrgent);
      if (urgent.length > 0) {
        await this.notifications.addBulk(
          urgent.map((alert) => ({
            name: alert.alertType,
            data: { organizationId: alert.organizationId, vehicleId: alert.vehicleId, alertType: alert.alertType, severity: alert.severity, details: alert.details, timestamp: alert.timestamp, latitude: alert.latitude, longitude: alert.longitude },
            opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 },
          })),
        );
      }
      this.emitted += result.alerts.length;
    }
    await this.states.set(ping.vehicleId, result.state);
    this.processed += 1;
  }

  private async onEvent(raw: string | undefined): Promise<void> {
    if (!raw) return;
    try {
      const event = JSON.parse(raw) as FleetEventMessage;
      if (event.event === 'geofence.changed') this.geofences.invalidate(event.organizationId);
      if (event.event === 'vehicle.changed') {
        this.vehicles.invalidate(event.entityId);
        if (event.payload?.deleted === true) await this.states.clear(event.entityId);
      }
      if (event.event === 'order.changed' || event.event === 'route.changed') {
        const vehicleId = typeof event.payload?.vehicleId === 'string' ? event.payload.vehicleId : null;
        if (vehicleId) this.routes.invalidateVehicle(vehicleId);
        else this.routes.invalidateAll();
      }
    } catch (error) {
      this.logger.warn(`event ignored: ${(error as Error).message}`);
    }
  }
}
