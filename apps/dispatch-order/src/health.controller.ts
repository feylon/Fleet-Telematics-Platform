import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async health() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', service: 'dispatch-order', timestamp: new Date().toISOString() };
  }
}
