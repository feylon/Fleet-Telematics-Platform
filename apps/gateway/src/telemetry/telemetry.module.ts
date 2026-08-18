import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device, Organization, Vehicle } from '@fleet/database';
import { AuthModule } from '../auth/auth.module';
import { DeviceAuthService } from './device-auth.service';
import { KafkaProducerService } from './kafka.producer';
import { PresenceService } from './presence.service';
import { IngestService } from './ingest.service';
import { LiveGateway } from './live.gateway';
import { LiveConsumer } from './live.consumer';
import { LiveController } from './live.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Device, Vehicle, Organization]), AuthModule],
  controllers: [LiveController],
  providers: [DeviceAuthService, KafkaProducerService, PresenceService, IngestService, LiveGateway, LiveConsumer],
  exports: [KafkaProducerService, PresenceService, DeviceAuthService, LiveGateway],
})
export class TelemetryModule {}
