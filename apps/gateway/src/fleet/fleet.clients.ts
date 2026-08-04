import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { FLEET_GRPC } from '../grpc/grpc-clients.module';

export interface VehicleGrpc {
  create(input: Record<string, unknown>): Observable<Record<string, unknown>>;
  update(request: { id: string; input: Record<string, unknown> }): Observable<Record<string, unknown>>;
  get(request: { id: string; organizationId: string }): Observable<Record<string, unknown>>;
  list(request: Record<string, unknown>): Observable<{ items: Record<string, unknown>[]; meta: Record<string, unknown> }>;
  getMany(request: { organizationId: string; ids: string[] }): Observable<{ items: Record<string, unknown>[] }>;
  delete(request: { id: string; organizationId: string }): Observable<{ deleted: boolean }>;
  setStatus(request: { id: string; organizationId: string; status: string }): Observable<Record<string, unknown>>;
}

export interface DeviceGrpc {
  create(input: Record<string, unknown>): Observable<Record<string, unknown>>;
  update(request: { id: string; input: Record<string, unknown> }): Observable<Record<string, unknown>>;
  get(request: { id: string; organizationId: string }): Observable<Record<string, unknown>>;
  list(request: Record<string, unknown>): Observable<{ items: Record<string, unknown>[]; meta: Record<string, unknown> }>;
  delete(request: { id: string; organizationId: string }): Observable<{ deleted: boolean }>;
  rotateToken(request: { id: string; organizationId: string }): Observable<Record<string, unknown>>;
}

export interface DriverGrpc {
  create(input: Record<string, unknown>): Observable<Record<string, unknown>>;
  update(request: { id: string; input: Record<string, unknown> }): Observable<Record<string, unknown>>;
  get(request: { id: string; organizationId: string }): Observable<Record<string, unknown>>;
  getByUser(request: { userId: string }): Observable<Record<string, unknown>>;
  list(request: Record<string, unknown>): Observable<{ items: Record<string, unknown>[]; meta: Record<string, unknown> }>;
  delete(request: { id: string; organizationId: string }): Observable<{ deleted: boolean }>;
  assignVehicle(request: { id: string; organizationId: string; vehicleId: string }): Observable<Record<string, unknown>>;
}

export interface MaintenanceGrpc {
  create(input: Record<string, unknown>): Observable<Record<string, unknown>>;
  list(request: Record<string, unknown>): Observable<{ items: Record<string, unknown>[]; meta: Record<string, unknown> }>;
  delete(request: { id: string; organizationId: string }): Observable<{ deleted: boolean }>;
  due(request: { organizationId: string }): Observable<{ items: Record<string, unknown>[] }>;
  upsertFuelNorm(input: Record<string, unknown>): Observable<Record<string, unknown>>;
  getFuelNorm(request: { id: string; organizationId: string }): Observable<Record<string, unknown>>;
}

@Injectable()
export class FleetClients implements OnModuleInit {
  vehicles: VehicleGrpc;
  devices: DeviceGrpc;
  drivers: DriverGrpc;
  maintenance: MaintenanceGrpc;

  constructor(@Inject(FLEET_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.vehicles = this.client.getService<VehicleGrpc>('VehicleService');
    this.devices = this.client.getService<DeviceGrpc>('DeviceService');
    this.drivers = this.client.getService<DriverGrpc>('DriverService');
    this.maintenance = this.client.getService<MaintenanceGrpc>('MaintenanceService');
  }
}
