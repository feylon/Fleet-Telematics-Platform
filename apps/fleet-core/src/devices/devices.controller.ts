import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { DeviceInput, DevicesService } from './devices.service';

@Controller()
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @GrpcMethod('DeviceService', 'Create')
  create(input: DeviceInput) {
    return this.devices.create(input);
  }

  @GrpcMethod('DeviceService', 'Update')
  update(request: { id: string; input: DeviceInput }) {
    return this.devices.update(request.id, request.input);
  }

  @GrpcMethod('DeviceService', 'Get')
  get(request: { id: string; organizationId: string }) {
    return this.devices.get(request.id, request.organizationId);
  }

  @GrpcMethod('DeviceService', 'List')
  list(request: { organizationId: string; search?: string; pagination?: { page?: number; pageSize?: number } }) {
    return this.devices.list(request);
  }

  @GrpcMethod('DeviceService', 'Delete')
  delete(request: { id: string; organizationId: string }) {
    return this.devices.delete(request.id, request.organizationId);
  }

  @GrpcMethod('DeviceService', 'RotateToken')
  rotateToken(request: { id: string; organizationId: string }) {
    return this.devices.rotateToken(request.id, request.organizationId);
  }

  @GrpcMethod('DeviceService', 'Resolve')
  resolve(request: { imei: string; token: string }) {
    return this.devices.resolve(request.imei, request.token);
  }

  @GrpcMethod('DeviceService', 'Touch')
  touch(request: { imei: string; seenAt: string }) {
    return this.devices.touch(request.imei, request.seenAt);
  }
}
