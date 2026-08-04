import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { DriverInput, DriversService } from './drivers.service';

@Controller()
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @GrpcMethod('DriverService', 'Create')
  create(input: DriverInput) {
    return this.drivers.create(input);
  }

  @GrpcMethod('DriverService', 'Update')
  update(request: { id: string; input: DriverInput }) {
    return this.drivers.update(request.id, request.input);
  }

  @GrpcMethod('DriverService', 'Get')
  get(request: { id: string; organizationId: string }) {
    return this.drivers.get(request.id, request.organizationId);
  }

  @GrpcMethod('DriverService', 'GetByUser')
  getByUser(request: { userId: string }) {
    return this.drivers.getByUser(request.userId);
  }

  @GrpcMethod('DriverService', 'List')
  list(request: { organizationId: string; search?: string; pagination?: { page?: number; pageSize?: number } }) {
    return this.drivers.list(request);
  }

  @GrpcMethod('DriverService', 'Delete')
  delete(request: { id: string; organizationId: string }) {
    return this.drivers.delete(request.id, request.organizationId);
  }

  @GrpcMethod('DriverService', 'AssignVehicle')
  assignVehicle(request: { id: string; organizationId: string; vehicleId: string }) {
    return this.drivers.assignVehicle(request.id, request.organizationId, request.vehicleId);
  }
}
