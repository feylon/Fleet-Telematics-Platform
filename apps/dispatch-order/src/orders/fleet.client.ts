import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { grpcErrorToHttp } from '@fleet/common';

export const FLEET_GRPC = 'FLEET_GRPC';

interface VehicleGrpc {
  get(request: { id: string; organizationId: string }): Observable<{ id: string; plateNumber: string; status: string; driverId: string; driverName: string }>;
  getMany(request: { organizationId: string; ids: string[] }): Observable<{ items: Array<{ id: string; plateNumber: string; status: string; driverId: string; driverName: string }> }>;
}

interface DriverGrpc {
  get(request: { id: string; organizationId: string }): Observable<{ id: string; fullName: string; vehicleId: string; isActive: boolean }>;
}

@Injectable()
export class FleetClient implements OnModuleInit {
  private vehicles: VehicleGrpc;
  private drivers: DriverGrpc;

  constructor(@Inject(FLEET_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.vehicles = this.client.getService<VehicleGrpc>('VehicleService');
    this.drivers = this.client.getService<DriverGrpc>('DriverService');
  }

  async vehicle(id: string, organizationId: string) {
    try {
      return await firstValueFrom(this.vehicles.get({ id, organizationId }).pipe(timeout(5000)));
    } catch (error) {
      throw grpcErrorToHttp(error);
    }
  }

  async vehicleMany(organizationId: string, ids: string[]) {
    if (ids.length === 0) return [];
    try {
      const response = await firstValueFrom(this.vehicles.getMany({ organizationId, ids }).pipe(timeout(5000)));
      return response.items ?? [];
    } catch {
      return [];
    }
  }

  async driver(id: string, organizationId: string) {
    try {
      return await firstValueFrom(this.drivers.get({ id, organizationId }).pipe(timeout(5000)));
    } catch (error) {
      throw grpcErrorToHttp(error);
    }
  }
}
