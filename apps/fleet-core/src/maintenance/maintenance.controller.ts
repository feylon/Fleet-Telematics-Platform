import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { FuelNormInput, MaintenanceInput, MaintenanceService } from './maintenance.service';

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @GrpcMethod('MaintenanceService', 'Create')
  create(input: MaintenanceInput) {
    return this.maintenance.create(input);
  }

  @GrpcMethod('MaintenanceService', 'List')
  list(request: { organizationId: string; vehicleId?: string; pagination?: { page?: number; pageSize?: number } }) {
    return this.maintenance.list(request);
  }

  @GrpcMethod('MaintenanceService', 'Delete')
  delete(request: { id: string; organizationId: string }) {
    return this.maintenance.delete(request.id, request.organizationId);
  }

  @GrpcMethod('MaintenanceService', 'Due')
  due(request: { organizationId: string }) {
    return this.maintenance.due(request.organizationId);
  }

  @GrpcMethod('MaintenanceService', 'UpsertFuelNorm')
  upsertFuelNorm(input: FuelNormInput) {
    return this.maintenance.upsertFuelNorm(input);
  }

  @GrpcMethod('MaintenanceService', 'GetFuelNorm')
  getFuelNorm(request: { id: string; organizationId: string }) {
    return this.maintenance.getFuelNorm(request.id, request.organizationId);
  }
}
