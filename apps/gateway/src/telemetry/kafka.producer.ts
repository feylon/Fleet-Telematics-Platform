import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { createKafka, FleetEventMessage, KafkaTopics, PlatformEnv, producerConfig, TelemetryMessage } from '@fleet/common';
import { ENV } from '../common/env.provider';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor(@Inject(ENV) env: PlatformEnv) {
    this.kafka = createKafka(env, '-producer');
    this.producer = this.kafka.producer(producerConfig);
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log('kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishTelemetry(messages: TelemetryMessage[]): Promise<void> {
    if (messages.length === 0) return;
    await this.producer.send({
      topic: KafkaTopics.telemetryRaw,
      messages: messages.map((message) => ({
        key: message.vehicleId,
        value: JSON.stringify(message),
        timestamp: String(new Date(message.timestamp).getTime()),
      })),
    });
  }

  async publishEvent(event: FleetEventMessage): Promise<void> {
    await this.producer.send({
      topic: KafkaTopics.fleetEvents,
      messages: [{ key: event.organizationId, value: JSON.stringify(event) }],
    });
  }
}
