import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions, loadEnv } from '@fleet/common';
import { buildDataSourceOptions, Order, Route, RouteCheckpoint } from '@fleet/database';
import { envProvider } from './common/env.provider';
import { redisProvider } from './common/redis.provider';
import { FleetEventsProducer } from './events/fleet-events.producer';
import { FLEET_GRPC, FleetClient } from './orders/fleet.client';
import { OrdersService } from './orders/orders.service';
import { OrdersController } from './orders/orders.controller';
import { RoutesService } from './routes/routes.service';
import { RoutesController } from './routes/routes.controller';
import { NearbyService } from './nearby/nearby.service';
import { HealthController } from './health.controller';

const env = loadEnv('dispatch-order');

@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions(env)),
    TypeOrmModule.forFeature([Order, Route, RouteCheckpoint]),
    ClientsModule.register([{ name: FLEET_GRPC, ...grpcClientOptions('fleet.v1', env.services.fleetCoreGrpc) }]),
  ],
  controllers: [OrdersController, RoutesController, HealthController],
  providers: [envProvider, redisProvider, FleetEventsProducer, FleetClient, OrdersService, RoutesService, NearbyService],
})
export class AppModule {}
