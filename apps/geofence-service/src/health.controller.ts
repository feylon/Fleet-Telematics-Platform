import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TelemetryConsumer } from './consumer/telemetry.consumer';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource, private readonly consumer: TelemetryConsumer) {}

  @Get()
  async health() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', service: 'geofence-service', ...this.consumer.stats(), timestamp: new Date().toISOString() };
  }
}
