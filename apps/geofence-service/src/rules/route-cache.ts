import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { LngLat } from '@fleet/common';
import { RouteRule } from './rule-engine';

export const DISPATCH_GRPC = 'DISPATCH_GRPC';
const TTL_MS = 60000;

interface RouteGrpc {
  activeRouteForVehicle(request: { organizationId: string; vehicleId: string }): Observable<{ found: boolean; orderId: string; route?: { polyline: Array<{ latitude: number; longitude: number }>; deviationThresholdKm: number } }>;
}

@Injectable()
export class RouteCache implements OnModuleInit {
  private readonly logger = new Logger(RouteCache.name);
  private routes: RouteGrpc;
  private readonly entries = new Map<string, { rule: RouteRule | null; at: number }>();

  constructor(@Inject(DISPATCH_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.routes = this.client.getService<RouteGrpc>('RouteService');
  }

  async forVehicle(organizationId: string, vehicleId: string): Promise<RouteRule | null> {
    const cached = this.entries.get(vehicleId);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.rule;
    let rule: RouteRule | null = null;
    try {
      const response = await firstValueFrom(this.routes.activeRouteForVehicle({ organizationId, vehicleId }).pipe(timeout(2000)));
      if (response.found && response.route) {
        rule = {
          orderId: response.orderId,
          polyline: response.route.polyline.map((point): LngLat => [point.longitude, point.latitude]),
          deviationThresholdKm: response.route.deviationThresholdKm > 0 ? response.route.deviationThresholdKm : 0.5,
        };
      }
    } catch (error) {
      this.logger.debug(`route lookup skipped: ${(error as Error).message}`);
    }
    this.entries.set(vehicleId, { rule, at: Date.now() });
    return rule;
  }

  invalidateVehicle(vehicleId: string): void {
    this.entries.delete(vehicleId);
  }

  invalidateAll(): void {
    this.entries.clear();
  }
}
