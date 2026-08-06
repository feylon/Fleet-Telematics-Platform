import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrderInput } from './order.mapper';
import { OrdersService } from './orders.service';
import { NearbyService } from '../nearby/nearby.service';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService, private readonly nearby: NearbyService) {}

  @GrpcMethod('OrderService', 'Create')
  create(input: OrderInput) {
    return this.orders.create(input);
  }

  @GrpcMethod('OrderService', 'Update')
  update(request: { id: string; input: OrderInput }) {
    return this.orders.update(request.id, request.input);
  }

  @GrpcMethod('OrderService', 'Get')
  get(request: { id: string; organizationId: string }) {
    return this.orders.get(request.id, request.organizationId);
  }

  @GrpcMethod('OrderService', 'List')
  list(request: { organizationId: string; status?: string; search?: string; driverId?: string; vehicleId?: string; pagination?: { page?: number; pageSize?: number } }) {
    return this.orders.list(request);
  }

  @GrpcMethod('OrderService', 'Delete')
  delete(request: { id: string; organizationId: string }) {
    return this.orders.delete(request.id, request.organizationId);
  }

  @GrpcMethod('OrderService', 'Assign')
  assign(request: { id: string; organizationId: string; vehicleId: string; driverId: string }) {
    return this.orders.assign(request.id, request.organizationId, request.vehicleId, request.driverId);
  }

  @GrpcMethod('OrderService', 'Transition')
  transition(request: { id: string; organizationId: string; status: string; actorDriverId: string }) {
    return this.orders.transition(request.id, request.organizationId, request.status, request.actorDriverId);
  }

  @GrpcMethod('OrderService', 'DriverOrders')
  driverOrders(request: { organizationId: string; driverId: string }) {
    return this.orders.driverOrders(request.organizationId, request.driverId);
  }

  @GrpcMethod('OrderService', 'Nearby')
  nearbyVehicles(request: { organizationId: string; latitude: number; longitude: number; radiusKm: number; limit: number }) {
    return this.nearby.find(request.organizationId, request.latitude, request.longitude, request.radiusKm, request.limit);
  }
}
