import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { VehiclesService } from './vehicles.service';
import { VehicleInput } from './vehicle.mapper';

@Controller()
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @GrpcMethod('VehicleService', 'Create')
  create(input: VehicleInput) {
    return this.vehicles.create(input);
  }

  @GrpcMethod('VehicleService', 'Update')
  update(request: { id: string; input: VehicleInput }) {
    return this.vehicles.update(request.id, request.input);
  }

  @GrpcMethod('VehicleService', 'Get')
  get(request: { id: string; organizationId: string }) {
    return this.vehicles.get(request.id, request.organizationId);
  }

  @GrpcMethod('VehicleService', 'List')
  list(request: { organizationId: string; search?: string; status?: string; pagination?: { page?: number; pageSize?: number } }) {
    return this.vehicles.list(request);
  }

  @GrpcMethod('VehicleService', 'GetMany')
  getMany(request: { organizationId: string; ids: string[] }) {
    return this.vehicles.getMany(request.organizationId, request.ids ?? []);
  }

  @GrpcMethod('VehicleService', 'Delete')
  delete(request: { id: string; organizationId: string }) {
    return this.vehicles.delete(request.id, request.organizationId);
  }

  @GrpcMethod('VehicleService', 'SetStatus')
  setStatus(request: { id: string; organizationId: string; status: string }) {
    return this.vehicles.setStatus(request.id, request.organizationId, request.status);
  }
}
