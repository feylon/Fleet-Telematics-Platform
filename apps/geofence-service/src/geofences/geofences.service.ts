import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rpcNotFound } from '@fleet/common';
import { Geofence } from '@fleet/database';
import { FleetEventsProducer } from '../alerts/fleet-events.producer';
import { GeofenceCache } from '../rules/geofence-cache';
import { VehicleStateStore } from '../rules/vehicle-state.store';
import { applyGeofenceInput, GeofenceInput, toGeofenceMessage } from './geofence.mapper';

@Injectable()
export class GeofencesService {
  constructor(
    @InjectRepository(Geofence) private readonly geofences: Repository<Geofence>,
    private readonly events: FleetEventsProducer,
    private readonly cache: GeofenceCache,
    private readonly states: VehicleStateStore,
  ) {}

  async create(input: GeofenceInput) {
    const saved = await this.geofences.save(applyGeofenceInput(this.geofences.create(), input));
    await this.changed(saved.organizationId, saved.id);
    return toGeofenceMessage(saved);
  }

  async update(id: string, input: GeofenceInput) {
    const geofence = await this.findScoped(id, input.organizationId);
    const saved = await this.geofences.save(applyGeofenceInput(geofence, input));
    await this.changed(saved.organizationId, saved.id);
    return toGeofenceMessage(saved);
  }

  async get(id: string, organizationId: string) {
    return toGeofenceMessage(await this.findScoped(id, organizationId));
  }

  async list(organizationId: string, onlyActive: boolean) {
    const rows = await this.geofences.find({ where: { organizationId, ...(onlyActive ? { isActive: true } : {}) }, order: { name: 'ASC' } });
    return { items: rows.map(toGeofenceMessage) };
  }

  async delete(id: string, organizationId: string) {
    const geofence = await this.findScoped(id, organizationId);
    await this.geofences.delete(geofence.id);
    await this.changed(organizationId, geofence.id);
    return { deleted: true };
  }

  async vehicleState(organizationId: string, vehicleId: string) {
    const state = await this.states.get(vehicleId);
    return { insideGeofenceIds: state?.insideGeofenceIds ?? [], lastEvaluatedAt: state?.lastTimestamp ?? '' };
  }

  private async changed(organizationId: string, id: string): Promise<void> {
    this.cache.invalidate(organizationId);
    await this.events.emit(organizationId, 'geofence.changed', id);
  }

  private async findScoped(id: string, organizationId: string): Promise<Geofence> {
    const geofence = await this.geofences.findOne({ where: { id, organizationId } });
    if (!geofence) throw rpcNotFound('Geofence not found');
    return geofence;
  }
}
