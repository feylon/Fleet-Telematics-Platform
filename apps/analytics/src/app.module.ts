import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { loadEnv } from '@fleet/common';
import { buildDataSourceOptions, Driver, Organization, Vehicle } from '@fleet/database';
import { envProvider } from './common/env.provider';
import { redisProvider } from './common/redis.provider';
import { ClickHouseService } from './clickhouse/clickhouse.service';
import { MetricsService } from './metrics/metrics.service';
import { RollupsService } from './rollups/rollups.service';
import { ROLLUPS_QUEUE, RollupsProcessor } from './rollups/rollups.processor';
import { ReportStore } from './reports/report.store';
import { ReportGenerator } from './reports/report.generator';
import { REPORTS_QUEUE, ReportsService } from './reports/reports.service';
import { ReportsProcessor } from './reports/reports.processor';
import { AnalyticsController } from './analytics.controller';
import { SchedulerService } from './scheduler.service';
import { HealthController } from './health.controller';

const env = loadEnv('analytics');

@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions(env)),
    TypeOrmModule.forFeature([Vehicle, Driver, Organization]),
    BullModule.forRoot({ connection: { host: env.redis.host, port: env.redis.port, password: env.redis.password || undefined } }),
    BullModule.registerQueue({ name: REPORTS_QUEUE }, { name: ROLLUPS_QUEUE }),
  ],
  controllers: [AnalyticsController, HealthController],
  providers: [envProvider, redisProvider, ClickHouseService, MetricsService, RollupsService, RollupsProcessor, ReportStore, ReportGenerator, ReportsService, ReportsProcessor, SchedulerService],
})
export class AppModule {}
