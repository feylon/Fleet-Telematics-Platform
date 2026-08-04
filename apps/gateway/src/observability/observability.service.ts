import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Admin, Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { DataSource } from 'typeorm';
import { createKafka, KafkaConsumerGroups, KafkaTopics, PlatformEnv } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { REDIS } from '../redis/redis.module';
import { LiveGateway } from '../telemetry/live.gateway';

export interface ConsumerLag {
  groupId: string;
  topic: string;
  lag: number;
  partitions: number;
}

@Injectable()
export class ObservabilityService implements OnModuleDestroy {
  private readonly logger = new Logger(ObservabilityService.name);
  private readonly kafka: Kafka;
  private admin: Admin | null = null;
  private readonly clickhouse: ClickHouseClient;

  constructor(
    @Inject(ENV) private readonly env: PlatformEnv,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly live: LiveGateway,
  ) {
    this.kafka = createKafka(env, '-observability');
    this.clickhouse = createClient({ url: env.clickhouse.url, username: env.clickhouse.user, password: env.clickhouse.password, database: env.clickhouse.database, request_timeout: 5000 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.admin?.disconnect();
    await this.clickhouse.close();
  }

  async snapshot() {
    const [kafka, clickhouse, redis, postgres] = await Promise.all([this.kafkaLag(), this.clickhouseStats(), this.redisStats(), this.postgresStats()]);
    return { timestamp: new Date().toISOString(), kafka, clickhouse, redis, postgres, websocket: { connectedClients: this.live.connectedClients() } };
  }

  private async getAdmin(): Promise<Admin> {
    if (!this.admin) {
      this.admin = this.kafka.admin();
      await this.admin.connect();
    }
    return this.admin;
  }

  async kafkaLag(): Promise<{ status: 'up' | 'down'; groups: ConsumerLag[]; topics: Array<{ topic: string; partitions: number; endOffset: number }> }> {
    try {
      const admin = await this.getAdmin();
      const topics = [KafkaTopics.telemetryRaw, KafkaTopics.fleetAlerts, KafkaTopics.fleetEvents];
      const topicInfo: Array<{ topic: string; partitions: number; endOffset: number }> = [];
      const endOffsets = new Map<string, Map<number, number>>();
      for (const topic of topics) {
        const offsets = await admin.fetchTopicOffsets(topic);
        const perPartition = new Map<number, number>();
        offsets.forEach((o) => perPartition.set(o.partition, Number(o.high)));
        endOffsets.set(topic, perPartition);
        topicInfo.push({ topic, partitions: offsets.length, endOffset: offsets.reduce((sum, o) => sum + Number(o.high), 0) });
      }
      const groups: ConsumerLag[] = [];
      const groupIds = [KafkaConsumerGroups.telemetryIngest, KafkaConsumerGroups.alertsIngest, KafkaConsumerGroups.geofenceSafety, KafkaConsumerGroups.geofenceEvents];
      for (const groupId of groupIds) {
        for (const topic of topics) {
          try {
            const committed = await admin.fetchOffsets({ groupId, topics: [topic] });
            const partitions = committed[0]?.partitions ?? [];
            if (partitions.every((p) => Number(p.offset) < 0)) continue;
            const lag = partitions.reduce((sum, p) => {
              const end = endOffsets.get(topic)?.get(p.partition) ?? 0;
              const current = Number(p.offset) < 0 ? end : Number(p.offset);
              return sum + Math.max(0, end - current);
            }, 0);
            groups.push({ groupId, topic, lag, partitions: partitions.length });
          } catch {
            continue;
          }
        }
      }
      return { status: 'up', groups, topics: topicInfo };
    } catch (error) {
      this.logger.warn(`kafka observability failed: ${(error as Error).message}`);
      this.admin = null;
      return { status: 'down', groups: [], topics: [] };
    }
  }

  async clickhouseStats() {
    try {
      const result = await this.clickhouse.query({
        query: `SELECT
          countIf(timestamp >= now() - INTERVAL 1 MINUTE) AS rows_last_minute,
          countIf(timestamp >= now() - INTERVAL 1 HOUR) AS rows_last_hour,
          count() AS total_rows,
          max(timestamp) AS latest
        FROM vehicle_telemetry`,
        format: 'JSONEachRow',
      });
      const rows = (await result.json()) as Array<Record<string, string | number>>;
      const alerts = await this.clickhouse.query({ query: `SELECT countIf(timestamp >= now() - INTERVAL 1 HOUR) AS alerts_last_hour, count() AS total_alerts FROM telemetry_alerts`, format: 'JSONEachRow' });
      const alertRows = (await alerts.json()) as Array<Record<string, string | number>>;
      return { status: 'up' as const, ...(rows[0] ?? {}), ...(alertRows[0] ?? {}) };
    } catch (error) {
      return { status: 'down' as const, error: (error as Error).message };
    }
  }

  async redisStats() {
    try {
      const info = await this.redis.info();
      const pick = (key: string) => info.split('\n').find((line) => line.startsWith(`${key}:`))?.split(':')[1]?.trim() ?? null;
      return { status: 'up' as const, usedMemory: pick('used_memory_human'), connectedClients: pick('connected_clients'), opsPerSec: pick('instantaneous_ops_per_sec'), uptimeSeconds: pick('uptime_in_seconds') };
    } catch (error) {
      return { status: 'down' as const, error: (error as Error).message };
    }
  }

  async postgresStats() {
    try {
      const rows = await this.dataSource.query(`SELECT count(*)::int AS connections, pg_database_size(current_database()) AS size_bytes FROM pg_stat_activity WHERE datname = current_database()`);
      return { status: 'up' as const, connections: rows[0]?.connections ?? 0, sizeBytes: Number(rows[0]?.size_bytes ?? 0) };
    } catch (error) {
      return { status: 'down' as const, error: (error as Error).message };
    }
  }
}
