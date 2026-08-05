import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AlertMessage, createKafka, KafkaConsumerGroups, KafkaTopics, PlatformEnv, TelemetryMessage } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { AlertRow, ClickHouseService, TelemetryRow, toAlertRow, toTelemetryRow } from '../clickhouse/clickhouse.service';
import { KafkaBatchConsumer } from './kafka-batch.consumer';

const parseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

@Injectable()
export class IngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestService.name);
  private readonly telemetry: KafkaBatchConsumer<TelemetryRow>;
  private readonly alerts: KafkaBatchConsumer<AlertRow>;

  constructor(@Inject(ENV) env: PlatformEnv, private readonly clickhouse: ClickHouseService) {
    const kafka = createKafka(env);
    this.telemetry = new KafkaBatchConsumer<TelemetryRow>({
      kafka,
      groupId: KafkaConsumerGroups.telemetryIngest,
      topic: KafkaTopics.telemetryRaw,
      maxSize: env.ingestBatchSize,
      maxMs: env.ingestBatchMs,
      parse: (value) => {
        const message = parseJson<TelemetryMessage>(value);
        return message && message.vehicleId && message.organizationId ? toTelemetryRow(message) : null;
      },
      write: (rows) => this.clickhouse.insertTelemetry(rows),
      logger: this.logger,
    });
    this.alerts = new KafkaBatchConsumer<AlertRow>({
      kafka,
      groupId: KafkaConsumerGroups.alertsIngest,
      topic: KafkaTopics.fleetAlerts,
      maxSize: 200,
      maxMs: env.ingestBatchMs,
      parse: (value) => {
        const alert = parseJson<AlertMessage>(value);
        return alert && alert.vehicleId && alert.alertType ? toAlertRow(alert) : null;
      },
      write: (rows) => this.clickhouse.insertAlerts(rows),
      logger: this.logger,
    });
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([this.telemetry.start(), this.alerts.start()]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.telemetry.stop(), this.alerts.stop()]);
  }

  stats() {
    return { telemetryRowsWritten: this.telemetry.totalWritten, alertRowsWritten: this.alerts.totalWritten };
  }
}
