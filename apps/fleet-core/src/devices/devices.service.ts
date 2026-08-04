import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { isoOrEmpty, pageOf, randomToken, rpcConflict, rpcInvalid, rpcNotFound, sha256Hex, stringOrEmpty } from '@fleet/common';
import { Device, Vehicle } from '@fleet/database';
import { FleetEventsProducer } from '../events/fleet-events.producer';

export interface DeviceInput {
  organizationId: string;
  imei: string;
  vehicleId?: string;
  model?: string;
  simNumber?: string;
  isActive?: boolean;
}

export const toDeviceMessage = (device: Device, plateNumber?: string | null) => ({
  id: device.id,
  organizationId: device.organizationId,
  imei: device.imei,
  vehicleId: stringOrEmpty(device.vehicleId),
  model: stringOrEmpty(device.model),
  simNumber: stringOrEmpty(device.simNumber),
  isActive: device.isActive,
  lastSeenAt: isoOrEmpty(device.lastSeenAt),
  createdAt: isoOrEmpty(device.createdAt),
  plateNumber: stringOrEmpty(plateNumber),
});

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly events: FleetEventsProducer,
  ) {}

  async create(input: DeviceInput) {
    this.validate(input);
    const duplicate = await this.devices.findOne({ where: { imei: input.imei } });
    if (duplicate) throw rpcConflict('IMEI already registered');
    await this.assertVehicleFree(input.organizationId, input.vehicleId, null);
    const token = randomToken(32);
    const saved = await this.devices.save(
      this.devices.create({
        organizationId: input.organizationId,
        imei: input.imei.trim(),
        vehicleId: input.vehicleId || null,
        tokenHash: sha256Hex(token),
        model: input.model || null,
        simNumber: input.simNumber || null,
        isActive: input.isActive ?? true,
      }),
    );
    await this.events.emit(saved.organizationId, 'device.changed', saved.id, { imei: saved.imei, action: 'created' });
    return { device: await this.withPlate(saved), token };
  }

  async update(id: string, input: DeviceInput) {
    this.validate(input);
    const device = await this.findScoped(id, input.organizationId);
    if (input.imei.trim() !== device.imei) {
      const duplicate = await this.devices.findOne({ where: { imei: input.imei.trim() } });
      if (duplicate) throw rpcConflict('IMEI already registered');
    }
    await this.assertVehicleFree(input.organizationId, input.vehicleId, device.id);
    const previousImei = device.imei;
    device.imei = input.imei.trim();
    device.vehicleId = input.vehicleId || null;
    device.model = input.model || null;
    device.simNumber = input.simNumber || null;
    device.isActive = input.isActive ?? device.isActive;
    const saved = await this.devices.save(device);
    await this.events.emit(saved.organizationId, 'device.changed', saved.id, { imei: previousImei, action: 'updated' });
    if (previousImei !== saved.imei) await this.events.emit(saved.organizationId, 'device.changed', saved.id, { imei: saved.imei, action: 'updated' });
    return this.withPlate(saved);
  }

  async get(id: string, organizationId: string) {
    return this.withPlate(await this.findScoped(id, organizationId));
  }

  async list(request: { organizationId: string; search?: string; pagination?: { page?: number; pageSize?: number } }) {
    const { page, pageSize, skip, take } = pageOf(request.pagination);
    const base = { organizationId: request.organizationId };
    const where = request.search ? [{ ...base, imei: ILike(`%${request.search}%`) }, { ...base, model: ILike(`%${request.search}%`) }] : base;
    const [rows, total] = await this.devices.findAndCount({ where, order: { createdAt: 'DESC' }, skip, take });
    const vehicleIds = rows.map((row) => row.vehicleId).filter((id): id is string => Boolean(id));
    const vehicles = vehicleIds.length ? await this.vehicles.find({ where: { id: In(vehicleIds) } }) : [];
    const plates = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plateNumber]));
    return { items: rows.map((row) => toDeviceMessage(row, row.vehicleId ? plates.get(row.vehicleId) : null)), meta: { page, pageSize, total } };
  }

  async delete(id: string, organizationId: string) {
    const device = await this.findScoped(id, organizationId);
    await this.devices.delete(device.id);
    await this.events.emit(organizationId, 'device.changed', device.id, { imei: device.imei, action: 'deleted' });
    return { deleted: true };
  }

  async rotateToken(id: string, organizationId: string) {
    const device = await this.findScoped(id, organizationId);
    const token = randomToken(32);
    device.tokenHash = sha256Hex(token);
    const saved = await this.devices.save(device);
    await this.events.emit(organizationId, 'device.changed', saved.id, { imei: saved.imei, action: 'token' });
    return { device: await this.withPlate(saved), token };
  }

  async resolve(imei: string, token: string) {
    const device = await this.devices.findOne({ where: { imei } });
    if (!device || !device.isActive || !device.vehicleId || device.tokenHash !== sha256Hex(token)) return { valid: false, organizationId: '', vehicleId: '', deviceId: '', maxSpeedKmh: 0, plateNumber: '' };
    const vehicle = await this.vehicles.findOne({ where: { id: device.vehicleId } });
    if (!vehicle) return { valid: false, organizationId: '', vehicleId: '', deviceId: '', maxSpeedKmh: 0, plateNumber: '' };
    return { valid: true, organizationId: device.organizationId, vehicleId: device.vehicleId, deviceId: device.id, maxSpeedKmh: vehicle.maxSpeedKmh, plateNumber: vehicle.plateNumber };
  }

  async touch(imei: string, seenAt: string) {
    await this.devices.update({ imei }, { lastSeenAt: seenAt ? new Date(seenAt) : new Date() });
    return {};
  }

  private validate(input: DeviceInput): void {
    if (!input.organizationId) throw rpcInvalid('organizationId is required');
    if (!input.imei || !/^\d{8,20}$/.test(input.imei.trim())) throw rpcInvalid('IMEI must be 8 to 20 digits');
  }

  private async assertVehicleFree(organizationId: string, vehicleId: string | undefined, currentDeviceId: string | null): Promise<void> {
    if (!vehicleId) return;
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw rpcNotFound('Vehicle not found in this organization');
    const bound = await this.devices.findOne({ where: { vehicleId } });
    if (bound && bound.id !== currentDeviceId) throw rpcConflict('Vehicle already has a tracker assigned');
  }

  private async findScoped(id: string, organizationId: string): Promise<Device> {
    const device = await this.devices.findOne({ where: { id, organizationId } });
    if (!device) throw rpcNotFound('Device not found');
    return device;
  }

  private async withPlate(device: Device) {
    const vehicle = device.vehicleId ? await this.vehicles.findOne({ where: { id: device.vehicleId } }) : null;
    return toDeviceMessage(device, vehicle?.plateNumber ?? null);
  }
}
