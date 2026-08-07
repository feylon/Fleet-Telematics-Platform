import { Controller, Get } from '@nestjs/common';
import { ClickHouseService } from './clickhouse/clickhouse.service';

@Controller('health')
export class HealthController {
  constructor(private readonly clickhouse: ClickHouseService) {}

  @Get()
  async health() {
    const clickhouse = await this.clickhouse.ping();
    return { status: clickhouse ? 'ok' : 'degraded', service: 'analytics', clickhouse, timestamp: new Date().toISOString() };
  }
}
