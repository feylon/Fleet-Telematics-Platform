import { dateOrNull, emptyToNull, isoOrEmpty, numberOrZero, stringOrEmpty, zeroToNull } from '@fleet/common';
import { Order, OrderPriority, Route, RouteCheckpoint } from '@fleet/database';

export interface OrderInput {
  organizationId: string;
  customerName: string;
  cargoDescription?: string;
  cargoWeightKg?: number;
  priority?: string;
  originAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  plannedStartAt?: string;
  plannedEndAt?: string;
  notes?: string;
  createdById?: string;
  orderNumber?: string;
}

export const applyOrderInput = (order: Order, input: OrderInput): Order => {
  order.organizationId = input.organizationId;
  order.customerName = input.customerName.trim();
  order.cargoDescription = emptyToNull(input.cargoDescription);
  order.cargoWeightKg = zeroToNull(input.cargoWeightKg);
  order.priority = (Object.values(OrderPriority) as string[]).includes(input.priority ?? '') ? (input.priority as OrderPriority) : order.priority ?? OrderPriority.NORMAL;
  order.originAddress = input.originAddress.trim();
  order.originLatitude = input.originLatitude;
  order.originLongitude = input.originLongitude;
  order.destinationAddress = input.destinationAddress.trim();
  order.destinationLatitude = input.destinationLatitude;
  order.destinationLongitude = input.destinationLongitude;
  order.plannedStartAt = dateOrNull(input.plannedStartAt);
  order.plannedEndAt = dateOrNull(input.plannedEndAt);
  order.notes = emptyToNull(input.notes);
  if (input.createdById) order.createdById = input.createdById;
  return order;
};

export const toCheckpointMessage = (checkpoint: RouteCheckpoint) => ({
  id: checkpoint.id,
  sequence: checkpoint.sequence,
  name: checkpoint.name,
  latitude: checkpoint.latitude,
  longitude: checkpoint.longitude,
  radiusM: checkpoint.radiusM,
  reachedAt: isoOrEmpty(checkpoint.reachedAt),
});

export const toRouteMessage = (route: Route, checkpoints: RouteCheckpoint[]) => ({
  id: route.id,
  orderId: route.orderId,
  polyline: route.polyline.map(([longitude, latitude]) => ({ latitude, longitude })),
  distanceKm: numberOrZero(route.distanceKm),
  deviationThresholdKm: numberOrZero(route.deviationThresholdKm),
  checkpoints: [...checkpoints].sort((a, b) => a.sequence - b.sequence).map(toCheckpointMessage),
});

export const toOrderMessage = (order: Order, route: Route | null, checkpoints: RouteCheckpoint[]) => ({
  id: order.id,
  organizationId: order.organizationId,
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  cargoDescription: stringOrEmpty(order.cargoDescription),
  cargoWeightKg: numberOrZero(order.cargoWeightKg),
  status: order.status,
  priority: order.priority,
  originAddress: order.originAddress,
  originLatitude: order.originLatitude,
  originLongitude: order.originLongitude,
  destinationAddress: order.destinationAddress,
  destinationLatitude: order.destinationLatitude,
  destinationLongitude: order.destinationLongitude,
  vehicleId: stringOrEmpty(order.vehicleId),
  driverId: stringOrEmpty(order.driverId),
  plannedStartAt: isoOrEmpty(order.plannedStartAt),
  plannedEndAt: isoOrEmpty(order.plannedEndAt),
  startedAt: isoOrEmpty(order.startedAt),
  completedAt: isoOrEmpty(order.completedAt),
  notes: stringOrEmpty(order.notes),
  createdById: stringOrEmpty(order.createdById),
  createdAt: isoOrEmpty(order.createdAt),
  updatedAt: isoOrEmpty(order.updatedAt),
  route: route ? toRouteMessage(route, checkpoints) : undefined,
});
