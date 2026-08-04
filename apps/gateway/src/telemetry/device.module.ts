import { Module } from '@nestjs/common';
import { TelemetryModule } from './telemetry.module';
import { DeviceController } from './device.controller';
import { IngestService } from './ingest.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '@fleet/database';

@Module({
  imports: [TelemetryModule, TypeOrmModule.forFeature([Device])],
  controllers: [DeviceController],
  providers: [IngestService],
})
export class DeviceModule {}
