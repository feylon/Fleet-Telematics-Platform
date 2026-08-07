import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { PlatformEnv } from '@fleet/common';
import { ENV } from '../common/env.provider';

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly client: ClickHouseClient;

  constructor(@Inject(ENV) env: PlatformEnv) {
    this.client = createClient({ url: env.clickhouse.url, username: env.clickhouse.user, password: env.clickhouse.password, database: env.clickhouse.database, request_timeout: 60000, max_open_connections: 10 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  async rows<T>(query: string, params: Record<string, unknown> = {}): Promise<T[]> {
    const result = await this.client.query({ query, query_params: params, format: 'JSONEachRow' });
    return (await result.json()) as T[];
  }

  async one<T>(query: string, params: Record<string, unknown> = {}): Promise<T | null> {
    const rows = await this.rows<T>(query, params);
    return rows[0] ?? null;
  }

  async insert(table: string, values: Record<string, unknown>[]): Promise<void> {
    if (values.length === 0) return;
    await this.client.insert({ table, values, format: 'JSONEachRow' });
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()).success;
    } catch {
      return false;
    }
  }
}
