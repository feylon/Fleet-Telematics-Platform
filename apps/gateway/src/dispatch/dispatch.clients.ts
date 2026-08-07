import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { DISPATCH_GRPC } from '../grpc/grpc-clients.module';

type Doc = Record<string, unknown>;

export interface OrderGrpc {
  create(input: Doc): Observable<Doc>;
  update(request: { id: string; input: Doc }): Observable<Doc>;
  get(request: { id: string; organizationId: string }): Observable<Doc>;
  list(request: Doc): Observable<{ items: Doc[]; meta: Doc }>;
  delete(request: { id: string; organizationId: string }): Observable<{ deleted: boolean }>;
  assign(request: { id: string; organizationId: string; vehicleId: string; driverId: string }): Observable<Doc>;
  transition(request: { id: string; organizationId: string; status: string; actorDriverId: string }): Observable<Doc>;
  driverOrders(request: { organizationId: string; driverId: string }): Observable<{ items: Doc[]; meta: Doc }>;
  nearby(request: { organizationId: string; latitude: number; longitude: number; radiusKm: number; limit: number }): Observable<{ items: Doc[] }>;
}

export interface RouteGrpc {
  setRoute(input: Doc): Observable<Doc>;
  activeRouteForVehicle(request: { organizationId: string; vehicleId: string }): Observable<Doc>;
  reachCheckpoint(request: { orderId: string; organizationId: string; checkpointId: string; actorDriverId: string }): Observable<Doc>;
}

@Injectable()
export class DispatchClients implements OnModuleInit {
  orders: OrderGrpc;
  routes: RouteGrpc;

  constructor(@Inject(DISPATCH_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.orders = this.client.getService<OrderGrpc>('OrderService');
    this.routes = this.client.getService<RouteGrpc>('RouteService');
  }
}
