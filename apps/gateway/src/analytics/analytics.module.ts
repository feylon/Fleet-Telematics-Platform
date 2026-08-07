import { Module } from '@nestjs/common';
import { FleetModule } from '../fleet/fleet.module';
import { AnalyticsClient } from './analytics.client';
import { AnalyticsController } from './analytics.controller';
import { DriverStatsController } from './driver-stats.controller';

@Module({
  imports: [FleetModule],
  controllers: [AnalyticsController, DriverStatsController],
  providers: [AnalyticsClient],
  exports: [AnalyticsClient],
})
export class AnalyticsModule {}
