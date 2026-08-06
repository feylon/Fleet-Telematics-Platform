import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { pageOf, rpcDenied, rpcFailed, rpcInvalid, rpcNotFound } from '@fleet/common';
import { Order, OrderStatus, Route, RouteCheckpoint, VehicleStatus } from '@fleet/database';
import { FleetEventsProducer } from '../events/fleet-events.producer';
import { FleetClient } from './fleet.client';
import { applyOrderInput, OrderInput, toOrderMessage } from './order.mapper';
import { canTransition, driverCanTransition, generateOrderNumber, isActiveStatus } from './order-status';

interface ListRequest {
  organizationId: string;
  status?: string;
  search?: string;
  driverId?: string;
  vehicleId?: string;
  pagination?: { page?: number; pageSize?: number };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    @InjectRepository(RouteCheckpoint) private readonly checkpoints: Repository<RouteCheckpoint>,
    private readonly fleet: FleetClient,
    private readonly events: FleetEventsProducer,
  ) {}

  async create(input: OrderInput) {
    this.validate(input);
    const order = applyOrderInput(this.orders.create({ status: OrderStatus.CREATED }), input);
    order.orderNumber = input.orderNumber && input.orderNumber !== '' ? input.orderNumber : await this.nextNumber(input.organizationId);
    const saved = await this.orders.save(order);
    await this.events.emit(saved.organizationId, 'order.changed', saved.id, { action: 'created' });
    return this.present(saved);
  }

  async update(id: string, input: OrderInput) {
    this.validate(input);
    const order = await this.findScoped(id, input.organizationId);
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) throw rpcFailed('Finished orders cannot be edited');
    const saved = await this.orders.save(applyOrderInput(order, input));
    await this.events.emit(saved.organizationId, 'order.changed', saved.id, { action: 'updated', vehicleId: saved.vehicleId ?? '' });
    return this.present(saved);
  }

  async get(id: string, organizationId: string) {
    return this.present(await this.findScoped(id, organizationId));
  }

  async list(request: ListRequest) {
    const { page, pageSize, skip, take } = pageOf(request.pagination);
    const base: Record<string, unknown> = { organizationId: request.organizationId };
    if (request.status) base.status = request.status;
    if (request.driverId) base.driverId = request.driverId;
    if (request.vehicleId) base.vehicleId = request.vehicleId;
    const where = request.search ? [{ ...base, orderNumber: ILike(`%${request.search}%`) }, { ...base, customerName: ILike(`%${request.search}%`) }, { ...base, destinationAddress: ILike(`%${request.search}%`) }] : base;
    const [rows, total] = await this.orders.findAndCount({ where, order: { createdAt: 'DESC' }, skip, take });
    return { items: await this.presentMany(rows), meta: { page, pageSize, total } };
  }

  async delete(id: string, organizationId: string) {
    const order = await this.findScoped(id, organizationId);
    if (order.status === OrderStatus.IN_PROGRESS) throw rpcFailed('An order in progress cannot be deleted');
    await this.orders.delete(order.id);
    await this.events.emit(organizationId, 'order.changed', order.id, { action: 'deleted', vehicleId: order.vehicleId ?? '' });
    return { deleted: true };
  }

  async assign(id: string, organizationId: string, vehicleId: string, driverId: string) {
    const order = await this.findScoped(id, organizationId);
    if (!isActiveStatus(order.status) && order.status !== OrderStatus.CREATED) throw rpcFailed('Only open orders can be assigned');
    if (!vehicleId) throw rpcInvalid('vehicleId is required');
    const vehicle = await this.fleet.vehicle(vehicleId, organizationId);
    if (vehicle.status !== VehicleStatus.ACTIVE) throw rpcFailed('Vehicle is not in service');
    const resolvedDriverId = driverId || vehicle.driverId;
    if (resolvedDriverId) {
      const driver = await this.fleet.driver(resolvedDriverId, organizationId);
      if (!driver.isActive) throw rpcFailed('Driver is not active');
    }
    const busy = await this.orders.findOne({ where: { organizationId, vehicleId, status: In([OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS]) } });
    if (busy && busy.id !== order.id) throw rpcFailed(`Vehicle already assigned to order ${busy.orderNumber}`);
    const previousVehicle = order.vehicleId;
    order.vehicleId = vehicleId;
    order.driverId = resolvedDriverId || null;
    if (order.status === OrderStatus.CREATED) order.status = OrderStatus.ASSIGNED;
    const saved = await this.orders.save(order);
    await this.events.emit(organizationId, 'order.changed', saved.id, { action: 'assigned', vehicleId, previousVehicleId: previousVehicle ?? '' });
    return this.present(saved);
  }

  async transition(id: string, organizationId: string, status: string, actorDriverId: string) {
    const order = await this.findScoped(id, organizationId);
    if (!(Object.values(OrderStatus) as string[]).includes(status)) throw rpcInvalid('Unknown status');
    const target = status as OrderStatus;
    if (actorDriverId) {
      if (order.driverId !== actorDriverId) throw rpcDenied('Order is not assigned to this driver');
      if (!driverCanTransition(order.status, target)) throw rpcFailed(`Driver cannot move order from ${order.status} to ${target}`);
    } else if (!canTransition(order.status, target)) {
      throw rpcFailed(`Cannot move order from ${order.status} to ${target}`);
    }
    if (target === OrderStatus.IN_PROGRESS) order.startedAt = new Date();
    if (target === OrderStatus.COMPLETED) order.completedAt = new Date();
    if (target === OrderStatus.CREATED) {
      order.vehicleId = null;
      order.driverId = null;
    }
    order.status = target;
    const saved = await this.orders.save(order);
    await this.events.emit(organizationId, 'order.changed', saved.id, { action: 'status', status: target, vehicleId: saved.vehicleId ?? '' });
    return this.present(saved);
  }

  async driverOrders(organizationId: string, driverId: string) {
    const rows = await this.orders.find({ where: { organizationId, driverId }, order: { createdAt: 'DESC' }, take: 100 });
    return { items: await this.presentMany(rows), meta: { page: 1, pageSize: rows.length, total: rows.length } };
  }

  private validate(input: OrderInput): void {
    if (!input.organizationId) throw rpcInvalid('organizationId is required');
    if (!input.customerName || !input.originAddress || !input.destinationAddress) throw rpcInvalid('customerName, originAddress and destinationAddress are required');
    const coords = [input.originLatitude, input.originLongitude, input.destinationLatitude, input.destinationLongitude];
    if (coords.some((value) => typeof value !== 'number' || Number.isNaN(value))) throw rpcInvalid('Origin and destination coordinates are required');
  }

  private async nextNumber(organizationId: string): Promise<string> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const count = await this.orders.createQueryBuilder('o').where('o.organizationId = :organizationId', { organizationId }).andWhere('o.createdAt >= :start', { start }).getCount();
    return generateOrderNumber(new Date(), count + 1);
  }

  private async findScoped(id: string, organizationId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id, organizationId } });
    if (!order) throw rpcNotFound('Order not found');
    return order;
  }

  private async present(order: Order) {
    const [item] = await this.presentMany([order]);
    return item;
  }

  private async presentMany(rows: Order[]) {
    if (rows.length === 0) return [];
    const routes = await this.routes.find({ where: { orderId: In(rows.map((row) => row.id)) } });
    const checkpoints = routes.length ? await this.checkpoints.find({ where: { routeId: In(routes.map((route) => route.id)) } }) : [];
    const routeByOrder = new Map(routes.map((route) => [route.orderId, route]));
    return rows.map((row) => {
      const route = routeByOrder.get(row.id) ?? null;
      return toOrderMessage(row, route, route ? checkpoints.filter((checkpoint) => checkpoint.routeId === route.id) : []);
    });
  }
}
