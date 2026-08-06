import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions, loadEnv } from '@fleet/common';
import { buildDataSourceOptions, FuelNorm, Geofence, Vehicle } from '@fleet/database';
import { envProvider } from './common/env.provider';
import { redisProvider } from './common/redis.provider';
import { GeofencesController } from './geofences/geofences.controller';
import { GeofencesService } from './geofences/geofences.service';
import { FleetEventsProducer } from './alerts/fleet-events.producer';
import { GeofenceCache } from './rules/geofence-cache';
import { VehicleCache } from './rules/vehicle-cache';
import { RouteCache, DISPATCH_GRPC } from './rules/route-cache';
import { VehicleStateStore } from './rules/vehicle-state.store';
import { TelemetryConsumer } from './consumer/telemetry.consumer';
import { NOTIFICATIONS_QUEUE } from './notifications/notifications.queue';
import { NotificationsProcessor } from './notifications/notifications.processor';
import { TelegramSender } from './notifications/telegram.sender';
import { HealthController } from './health.controller';

const env = loadEnv('geofence-service');

@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions(env)),
    TypeOrmModule.forFeature([Geofence, Vehicle, FuelNorm]),
    BullModule.forRoot({ connection: { host: env.redis.host, port: env.redis.port, password: env.redis.password || undefined } }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    ClientsModule.register([{ name: DISPATCH_GRPC, ...grpcClientOptions('dispatch.v1', env.services.dispatchGrpc) }]),
  ],
  controllers: [GeofencesController, HealthController],
  providers: [envProvider, redisProvider, GeofencesService, FleetEventsProducer, GeofenceCache, VehicleCache, RouteCache, VehicleStateStore, TelemetryConsumer, NotificationsProcessor, TelegramSender],
})
export class AppModule {}
