import { Module } from '@nestjs/common';
import { envProvider } from './common/env.provider';
import { ClickHouseService } from './clickhouse/clickhouse.service';
import { IngestService } from './ingest/ingest.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [envProvider, ClickHouseService, IngestService],
})
export class AppModule {}
