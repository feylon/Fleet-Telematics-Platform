import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GeofenceInput } from './geofence.mapper';
import { GeofencesService } from './geofences.service';

@Controller()
export class GeofencesController {
  constructor(private readonly geofences: GeofencesService) {}

  @GrpcMethod('GeofenceService', 'Create')
  create(input: GeofenceInput) {
    return this.geofences.create(input);
  }

  @GrpcMethod('GeofenceService', 'Update')
  update(request: { id: string; input: GeofenceInput }) {
    return this.geofences.update(request.id, request.input);
  }

  @GrpcMethod('GeofenceService', 'Get')
  get(request: { id: string; organizationId: string }) {
    return this.geofences.get(request.id, request.organizationId);
  }

  @GrpcMethod('GeofenceService', 'List')
  list(request: { organizationId: string; onlyActive?: boolean }) {
    return this.geofences.list(request.organizationId, request.onlyActive ?? false);
  }

  @GrpcMethod('GeofenceService', 'Delete')
  delete(request: { id: string; organizationId: string }) {
    return this.geofences.delete(request.id, request.organizationId);
  }

  @GrpcMethod('GeofenceService', 'VehicleState')
  vehicleState(request: { organizationId: string; vehicleId: string }) {
    return this.geofences.vehicleState(request.organizationId, request.vehicleId);
  }
}
