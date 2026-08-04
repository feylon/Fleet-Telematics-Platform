import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { pageOf, rpcConflict, rpcInvalid, rpcNotFound } from '@fleet/common';
import { Device, Driver, Vehicle, VehicleStatus } from '@fleet/database';
import { FleetEventsProducer } from '../events/fleet-events.producer';
import { applyVehicleInput, toVehicleMessage, VehicleExtras, VehicleInput } from './vehicle.mapper';

interface ListRequest {
  organizationId: string;
  search?: string;
  status?: string;
  pagination?: { page?: number; pageSize?: number };
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    private readonly events: FleetEventsProducer,
  ) {}

  async create(input: VehicleInput) {
    this.validate(input);
    const duplicate = await this.vehicles.findOne({ where: { organizationId: input.organizationId, plateNumber: input.plateNumber.trim().toUpperCase() } });
    if (duplicate) throw rpcConflict('Plate number already registered in this organization');
    const saved = await this.vehicles.save(applyVehicleInput(this.vehicles.create(), input));
    await this.events.emit(saved.organizationId, 'vehicle.changed', saved.id, { action: 'created' });
    return this.withExtras(saved);
  }

  async update(id: string, input: VehicleInput) {
    this.validate(input);
    const vehicle = await this.findScoped(id, input.organizationId);
    const plate = input.plateNumber.trim().toUpperCase();
    if (plate !== vehicle.plateNumber) {
      const duplicate = await this.vehicles.findOne({ where: { organizationId: input.organizationId, plateNumber: plate } });
      if (duplicate) throw rpcConflict('Plate number already registered in this organization');
    }
    const saved = await this.vehicles.save(applyVehicleInput(vehicle, input));
    await this.events.emit(saved.organizationId, 'vehicle.changed', saved.id, { action: 'updated' });
    return this.withExtras(saved);
  }

  async get(id: string, organizationId: string) {
    return this.withExtras(await this.findScoped(id, organizationId));
  }

  async getMany(organizationId: string, ids: string[]) {
    if (ids.length === 0) return { items: [] };
    const rows = await this.vehicles.find({ where: { organizationId, id: In(ids) } });
    return { items: await this.withExtrasMany(rows) };
  }

  async list(request: ListRequest) {
    const { page, pageSize, skip, take } = pageOf(request.pagination);
    const base = { organizationId: request.organizationId, ...(request.status ? { status: request.status as VehicleStatus } : {}) };
    const where = request.search
      ? [
          { ...base, plateNumber: ILike(`%${request.search}%`) },
          { ...base, brand: ILike(`%${request.search}%`) },
          { ...base, model: ILike(`%${request.search}%`) },
          { ...base, vin: ILike(`%${request.search}%`) },
        ]
      : base;
    const [rows, total] = await this.vehicles.findAndCount({ where, order: { plateNumber: 'ASC' }, skip, take });
    return { items: await this.withExtrasMany(rows), meta: { page, pageSize, total } };
  }

  async delete(id: string, organizationId: string) {
    const vehicle = await this.findScoped(id, organizationId);
    await this.vehicles.delete(vehicle.id);
    await this.events.emit(organizationId, 'vehicle.changed', vehicle.id, { action: 'deleted', deleted: true });
    return { deleted: true };
  }

  async setStatus(id: string, organizationId: string, status: string) {
    if (!(Object.values(VehicleStatus) as string[]).includes(status)) throw rpcInvalid('Unknown vehicle status');
    const vehicle = await this.findScoped(id, organizationId);
    vehicle.status = status as VehicleStatus;
    const saved = await this.vehicles.save(vehicle);
    await this.events.emit(organizationId, 'vehicle.changed', saved.id, { action: 'status', status });
    return this.withExtras(saved);
  }

  private validate(input: VehicleInput): void {
    if (!input.organizationId) throw rpcInvalid('organizationId is required');
    if (!input.plateNumber || input.plateNumber.trim().length < 3) throw rpcInvalid('plateNumber is required');
    if (!input.brand || !input.model) throw rpcInvalid('brand and model are required');
  }

  private async findScoped(id: string, organizationId: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOne({ where: { id, organizationId } });
    if (!vehicle) throw rpcNotFound('Vehicle not found');
    return vehicle;
  }

  private async withExtras(vehicle: Vehicle) {
    const [items] = [await this.withExtrasMany([vehicle])];
    return items[0];
  }

  private async withExtrasMany(rows: Vehicle[]) {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [devices, drivers] = await Promise.all([this.devices.find({ where: { vehicleId: In(ids) } }), this.drivers.find({ where: { vehicleId: In(ids) } })]);
    const deviceByVehicle = new Map(devices.map((device) => [device.vehicleId, device]));
    const driverByVehicle = new Map(drivers.map((driver) => [driver.vehicleId, driver]));
    return rows.map((row) => {
      const extras: VehicleExtras = {
        imei: deviceByVehicle.get(row.id)?.imei ?? null,
        driverId: driverByVehicle.get(row.id)?.id ?? null,
        driverName: driverByVehicle.get(row.id)?.fullName ?? null,
      };
      return toVehicleMessage(row, extras);
    });
  }
}
