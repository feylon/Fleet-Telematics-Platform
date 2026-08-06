import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geofence } from '@fleet/database';
import { GeofenceRule } from './rule-engine';
import { toGeofenceRule } from '../geofences/geofence.mapper';

const TTL_MS = 60000;

@Injectable()
export class GeofenceCache {
  private readonly entries = new Map<string, { rules: GeofenceRule[]; at: number }>();

  constructor(@InjectRepository(Geofence) private readonly geofences: Repository<Geofence>) {}

  async forOrganization(organizationId: string): Promise<GeofenceRule[]> {
    const cached = this.entries.get(organizationId);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.rules;
    const rows = await this.geofences.find({ where: { organizationId, isActive: true } });
    const rules = rows.map(toGeofenceRule);
    this.entries.set(organizationId, { rules, at: Date.now() });
    return rules;
  }

  invalidate(organizationId: string): void {
    this.entries.delete(organizationId);
  }
}
