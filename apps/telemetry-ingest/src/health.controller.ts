import { Controller, Get } from '@nestjs/common';
import { ClickHouseService } from './clickhouse/clickhouse.service';
import { IngestService } from './ingest/ingest.service';

@Controller('health')
export class HealthController {
  constructor(private readonly clickhouse: ClickHouseService, private readonly ingest: IngestService) {}

  @Get()
  async health() {
    const clickhouse = await this.clickhouse.ping();
    return { status: clickhouse ? 'ok' : 'degraded', service: 'telemetry-ingest', clickhouse, ...this.ingest.stats(), timestamp: new Date().toISOString() };
  }
}
