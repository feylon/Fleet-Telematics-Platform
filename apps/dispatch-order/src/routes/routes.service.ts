import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { haversineKm, LngLat, rpcDenied, rpcInvalid, rpcNotFound } from '@fleet/common';
import { Order, OrderStatus, Route, RouteCheckpoint } from '@fleet/database';
import { FleetEventsProducer } from '../events/fleet-events.producer';
import { toRouteMessage } from '../orders/order.mapper';

export interface SetRouteInput {
  orderId: string;
  organizationId: string;
  polyline: Array<{ latitude: number; longitude: number }>;
  deviationThresholdKm?: number;
  checkpoints?: Array<{ sequence: number; name: string; latitude: number; longitude: number; radiusM?: number }>;
}

export const polylineDistanceKm = (line: LngLat[]): number => {
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    total += haversineKm({ longitude: line[i][0], latitude: line[i][1] }, { longitude: line[i + 1][0], latitude: line[i + 1][1] });
  }
  return Number(total.toFixed(3));
};

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    @InjectRepository(RouteCheckpoint) private readonly checkpoints: Repository<RouteCheckpoint>,
    private readonly events: FleetEventsProducer,
  ) {}

  async setRoute(input: SetRouteInput) {
    const order = await this.orders.findOne({ where: { id: input.orderId, organizationId: input.organizationId } });
    if (!order) throw rpcNotFound('Order not found');
    if (!input.polyline || input.polyline.length < 2) throw rpcInvalid('Polyline needs at least two points');
    const polyline: LngLat[] = input.polyline.map((point) => [point.longitude, point.latitude]);
    const existing = (await this.routes.findOne({ where: { orderId: order.id } })) ?? this.routes.create({ orderId: order.id, organizationId: order.organizationId });
    existing.polyline = polyline;
    existing.distanceKm = polylineDistanceKm(polyline);
    existing.deviationThresholdKm = input.deviationThresholdKm && input.deviationThresholdKm > 0 ? input.deviationThresholdKm : 0.5;
    const route = await this.routes.save(existing);
    await this.checkpoints.delete({ routeId: route.id });
    const checkpoints = await this.checkpoints.save(
      (input.checkpoints ?? []).map((checkpoint, index) =>
        this.checkpoints.create({
          routeId: route.id,
          sequence: checkpoint.sequence > 0 ? checkpoint.sequence : index + 1,
          name: checkpoint.name || `Checkpoint ${index + 1}`,
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
          radiusM: checkpoint.radiusM && checkpoint.radiusM > 0 ? checkpoint.radiusM : 200,
          reachedAt: null,
        }),
      ),
    );
    await this.events.emit(order.organizationId, 'route.changed', order.id, { vehicleId: order.vehicleId ?? '' });
    return toRouteMessage(route, checkpoints);
  }

  async activeRouteForVehicle(organizationId: string, vehicleId: string) {
    const order = await this.orders.findOne({ where: { organizationId, vehicleId, status: In([OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS]) }, order: { updatedAt: 'DESC' } });
    if (!order) return { found: false, orderId: '', route: undefined };
    const route = await this.routes.findOne({ where: { orderId: order.id } });
    if (!route) return { found: false, orderId: order.id, route: undefined };
    const checkpoints = await this.checkpoints.find({ where: { routeId: route.id } });
    return { found: true, orderId: order.id, route: toRouteMessage(route, checkpoints) };
  }

  async reachCheckpoint(orderId: string, organizationId: string, checkpointId: string, actorDriverId: string) {
    const order = await this.orders.findOne({ where: { id: orderId, organizationId } });
    if (!order) throw rpcNotFound('Order not found');
    if (actorDriverId && order.driverId !== actorDriverId) throw rpcDenied('Order is not assigned to this driver');
    const route = await this.routes.findOne({ where: { orderId: order.id } });
    if (!route) throw rpcNotFound('Order has no route');
    const checkpoint = await this.checkpoints.findOne({ where: { id: checkpointId, routeId: route.id } });
    if (!checkpoint) throw rpcNotFound('Checkpoint not found');
    if (!checkpoint.reachedAt) {
      checkpoint.reachedAt = new Date();
      await this.checkpoints.save(checkpoint);
    }
    const checkpoints = await this.checkpoints.find({ where: { routeId: route.id } });
    await this.events.emit(organizationId, 'order.changed', order.id, { action: 'checkpoint', checkpointId, vehicleId: order.vehicleId ?? '' });
    return toRouteMessage(route, checkpoints);
  }
}
