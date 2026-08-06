import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelNorm, Vehicle } from '@fleet/database';
import { VehicleRule } from './rule-engine';

const TTL_MS = 120000;

@Injectable()
export class VehicleCache {
  private readonly entries = new Map<string, { rule: VehicleRule; at: number }>();

  constructor(@InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>, @InjectRepository(FuelNorm) private readonly norms: Repository<FuelNorm>) {}

  async forVehicle(vehicleId: string, fallbackMaxSpeed = 90): Promise<VehicleRule> {
    const cached = this.entries.get(vehicleId);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.rule;
    const [vehicle, norm] = await Promise.all([this.vehicles.findOne({ where: { id: vehicleId } }), this.norms.findOne({ where: { vehicleId } })]);
    const rule: VehicleRule = {
      maxSpeedKmh: vehicle?.maxSpeedKmh ?? fallbackMaxSpeed,
      fuelDropAlertFraction: norm?.fuelDropAlertFraction ?? 0.2,
      plateNumber: vehicle?.plateNumber ?? vehicleId.slice(0, 8),
    };
    this.entries.set(vehicleId, { rule, at: Date.now() });
    return rule;
  }

  invalidate(vehicleId: string): void {
    this.entries.delete(vehicleId);
  }
}
