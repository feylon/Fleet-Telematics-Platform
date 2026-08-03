import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Public, SkipAudit } from '../common/decorators';
import { REDIS } from '../redis/redis.module';

@ApiTags('Public')
@Controller('api/health')
export class HealthController {
  constructor(private readonly dataSource: DataSource, @Inject(REDIS) private readonly redis: Redis) {}

  @Public()
  @SkipAudit()
  @Get()
  @ApiOperation({ summary: 'Liveness and dependency readiness' })
  async health() {
    const checks: Record<string, 'up' | 'down'> = { postgres: 'down', redis: 'down' };
    try {
      await this.dataSource.query('SELECT 1');
      checks.postgres = 'up';
    } catch {
      checks.postgres = 'down';
    }
    try {
      checks.redis = (await this.redis.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
      checks.redis = 'down';
    }
    const status = Object.values(checks).every((value) => value === 'up') ? 'ok' : 'degraded';
    return { status, checks, timestamp: new Date().toISOString() };
  }
}
