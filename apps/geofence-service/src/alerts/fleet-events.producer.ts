import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { AlertMessage, createKafka, FleetEventMessage, FleetEventName, KafkaTopics, PlatformEnv, producerConfig } from '@fleet/common';
import { ENV } from '../common/env.provider';

@Injectable()
export class FleetEventsProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FleetEventsProducer.name);
  private readonly producer: Producer;

  constructor(@Inject(ENV) env: PlatformEnv) {
    this.producer = createKafka(env, '-producer').producer(producerConfig);
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async emit(organizationId: string, event: FleetEventName, entityId: string, payload?: Record<string, unknown>): Promise<void> {
    const message: FleetEventMessage = { organizationId, event, entityId, timestamp: new Date().toISOString(), payload };
    try {
      await this.producer.send({ topic: KafkaTopics.fleetEvents, messages: [{ key: organizationId, value: JSON.stringify(message) }] });
    } catch (error) {
      this.logger.warn(`fleet event not published: ${(error as Error).message}`);
    }
  }

  async publishAlerts(alerts: AlertMessage[]): Promise<void> {
    if (alerts.length === 0) return;
    await this.producer.send({
      topic: KafkaTopics.fleetAlerts,
      messages: alerts.map((alert) => ({ key: alert.vehicleId, value: JSON.stringify(alert) })),
    });
  }
}
