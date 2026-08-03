import { Module } from '@nestjs/common';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { ObservabilityService } from './observability.service';
import { ObservabilityController } from './observability.controller';

@Module({
  imports: [TelemetryModule],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
})
export class ObservabilityModule {}
