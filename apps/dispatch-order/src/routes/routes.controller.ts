import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RoutesService, SetRouteInput } from './routes.service';

@Controller()
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @GrpcMethod('RouteService', 'SetRoute')
  setRoute(input: SetRouteInput) {
    return this.routes.setRoute(input);
  }

  @GrpcMethod('RouteService', 'ActiveRouteForVehicle')
  activeRouteForVehicle(request: { organizationId: string; vehicleId: string }) {
    return this.routes.activeRouteForVehicle(request.organizationId, request.vehicleId);
  }

  @GrpcMethod('RouteService', 'ReachCheckpoint')
  reachCheckpoint(request: { orderId: string; organizationId: string; checkpointId: string; actorDriverId: string }) {
    return this.routes.reachCheckpoint(request.orderId, request.organizationId, request.checkpointId, request.actorDriverId);
  }
}
