import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions, loadEnv } from '@fleet/common';

export const FLEET_GRPC = 'FLEET_GRPC';
export const GEOFENCE_GRPC = 'GEOFENCE_GRPC';
export const DISPATCH_GRPC = 'DISPATCH_GRPC';
export const ANALYTICS_GRPC = 'ANALYTICS_GRPC';

const env = loadEnv('gateway');

@Global()
@Module({
  imports: [
    ClientsModule.register([
      { name: FLEET_GRPC, ...grpcClientOptions('fleet.v1', env.services.fleetCoreGrpc) },
      { name: GEOFENCE_GRPC, ...grpcClientOptions('geofence.v1', env.services.geofenceGrpc) },
      { name: DISPATCH_GRPC, ...grpcClientOptions('dispatch.v1', env.services.dispatchGrpc) },
      { name: ANALYTICS_GRPC, ...grpcClientOptions('analytics.v1', env.services.analyticsGrpc) },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientsModule {}
