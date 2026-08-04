import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { emptyToNull, isoOrEmpty, pageOf, rpcConflict, rpcInvalid, rpcNotFound, stringOrEmpty } from '@fleet/common';
import { Driver, Role, User, Vehicle } from '@fleet/database';
import { FleetEventsProducer } from '../events/fleet-events.producer';

export interface DriverInput {
  organizationId: string;
  userId?: string;
  fullName: string;
  phone?: string;
  licenseNumber?: string;
  licenseCategories?: string[];
  licenseExpiresAt?: string;
  birthDate?: string;
  vehicleId?: string;
  shiftStart?: string;
  shiftEnd?: string;
  isActive?: boolean;
  hiredAt?: string;
}

const dateString = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const timeString = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value) ? value.length === 5 ? `${value}:00` : value : null;
};

export const toDriverMessage = (driver: Driver, plateNumber?: string | null, login?: string | null) => ({
  id: driver.id,
  organizationId: driver.organizationId,
  userId: stringOrEmpty(driver.userId),
  fullName: driver.fullName,
  phone: stringOrEmpty(driver.phone),
  licenseNumber: stringOrEmpty(driver.licenseNumber),
  licenseCategories: driver.licenseCategories ?? [],
  licenseExpiresAt: stringOrEmpty(driver.licenseExpiresAt),
  birthDate: stringOrEmpty(driver.birthDate),
  vehicleId: stringOrEmpty(driver.vehicleId),
  shiftStart: stringOrEmpty(driver.shiftStart),
  shiftEnd: stringOrEmpty(driver.shiftEnd),
  isActive: driver.isActive,
  hiredAt: stringOrEmpty(driver.hiredAt),
  createdAt: isoOrEmpty(driver.createdAt),
  plateNumber: stringOrEmpty(plateNumber),
  login: stringOrEmpty(login),
});

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly events: FleetEventsProducer,
  ) {}

  async create(input: DriverInput) {
    this.validate(input);
    await this.assertUser(input.organizationId, input.userId, null);
    await this.assertVehicle(input.organizationId, input.vehicleId, null);
    const saved = await this.drivers.save(this.apply(this.drivers.create(), input));
    await this.events.emit(saved.organizationId, 'driver.changed', saved.id, { action: 'created' });
    return this.enrich(saved);
  }

  async update(id: string, input: DriverInput) {
    this.validate(input);
    const driver = await this.findScoped(id, input.organizationId);
    await this.assertUser(input.organizationId, input.userId, driver.id);
    await this.assertVehicle(input.organizationId, input.vehicleId, driver.id);
    const saved = await this.drivers.save(this.apply(driver, input));
    await this.events.emit(saved.organizationId, 'driver.changed', saved.id, { action: 'updated' });
    return this.enrich(saved);
  }

  async get(id: string, organizationId: string) {
    return this.enrich(await this.findScoped(id, organizationId));
  }

  async getByUser(userId: string) {
    const driver = await this.drivers.findOne({ where: { userId } });
    if (!driver) throw rpcNotFound('Driver profile not found for this user');
    return this.enrich(driver);
  }

  async list(request: { organizationId: string; search?: string; pagination?: { page?: number; pageSize?: number } }) {
    const { page, pageSize, skip, take } = pageOf(request.pagination);
    const base = { organizationId: request.organizationId };
    const where = request.search ? [{ ...base, fullName: ILike(`%${request.search}%`) }, { ...base, phone: ILike(`%${request.search}%`) }, { ...base, licenseNumber: ILike(`%${request.search}%`) }] : base;
    const [rows, total] = await this.drivers.findAndCount({ where, order: { fullName: 'ASC' }, skip, take });
    const vehicleIds = rows.map((row) => row.vehicleId).filter((id): id is string => Boolean(id));
    const userIds = rows.map((row) => row.userId).filter((id): id is string => Boolean(id));
    const [vehicles, users] = await Promise.all([
      vehicleIds.length ? this.vehicles.find({ where: { id: In(vehicleIds) } }) : [],
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : [],
    ]);
    const plates = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plateNumber]));
    const logins = new Map(users.map((user) => [user.id, user.login]));
    return { items: rows.map((row) => toDriverMessage(row, row.vehicleId ? plates.get(row.vehicleId) : null, row.userId ? logins.get(row.userId) : null)), meta: { page, pageSize, total } };
  }

  async delete(id: string, organizationId: string) {
    const driver = await this.findScoped(id, organizationId);
    await this.drivers.delete(driver.id);
    await this.events.emit(organizationId, 'driver.changed', driver.id, { action: 'deleted' });
    return { deleted: true };
  }

  async assignVehicle(id: string, organizationId: string, vehicleId: string) {
    const driver = await this.findScoped(id, organizationId);
    await this.assertVehicle(organizationId, vehicleId || undefined, driver.id);
    driver.vehicleId = vehicleId || null;
    const saved = await this.drivers.save(driver);
    await this.events.emit(organizationId, 'driver.changed', saved.id, { action: 'assigned', vehicleId: saved.vehicleId });
    return this.enrich(saved);
  }

  private apply(driver: Driver, input: DriverInput): Driver {
    driver.organizationId = input.organizationId;
    driver.userId = input.userId || null;
    driver.fullName = input.fullName.trim();
    driver.phone = emptyToNull(input.phone);
    driver.licenseNumber = emptyToNull(input.licenseNumber);
    driver.licenseCategories = (input.licenseCategories ?? []).map((category) => category.trim().toUpperCase()).filter(Boolean);
    driver.licenseExpiresAt = dateString(input.licenseExpiresAt);
    driver.birthDate = dateString(input.birthDate);
    driver.vehicleId = input.vehicleId || null;
    driver.shiftStart = timeString(input.shiftStart);
    driver.shiftEnd = timeString(input.shiftEnd);
    driver.isActive = input.isActive ?? true;
    driver.hiredAt = dateString(input.hiredAt);
    return driver;
  }

  private validate(input: DriverInput): void {
    if (!input.organizationId) throw rpcInvalid('organizationId is required');
    if (!input.fullName || input.fullName.trim().length < 2) throw rpcInvalid('fullName is required');
  }

  private async assertUser(organizationId: string, userId: string | undefined, currentDriverId: string | null): Promise<void> {
    if (!userId) return;
    const user = await this.users.findOne({ where: { id: userId, organizationId } });
    if (!user) throw rpcNotFound('User not found in this organization');
    if (user.role !== Role.DRIVER) throw rpcInvalid('Linked user must have the DRIVER role');
    const bound = await this.drivers.findOne({ where: { userId } });
    if (bound && bound.id !== currentDriverId) throw rpcConflict('User already linked to another driver');
  }

  private async assertVehicle(organizationId: string, vehicleId: string | undefined, currentDriverId: string | null): Promise<void> {
    if (!vehicleId) return;
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw rpcNotFound('Vehicle not found in this organization');
    const bound = await this.drivers.findOne({ where: { vehicleId } });
    if (bound && bound.id !== currentDriverId) throw rpcConflict('Vehicle already assigned to another driver');
  }

  private async findScoped(id: string, organizationId: string): Promise<Driver> {
    const driver = await this.drivers.findOne({ where: { id, organizationId } });
    if (!driver) throw rpcNotFound('Driver not found');
    return driver;
  }

  private async enrich(driver: Driver) {
    const [vehicle, user] = await Promise.all([
      driver.vehicleId ? this.vehicles.findOne({ where: { id: driver.vehicleId } }) : null,
      driver.userId ? this.users.findOne({ where: { id: driver.userId } }) : null,
    ]);
    return toDriverMessage(driver, vehicle?.plateNumber ?? null, user?.login ?? null);
  }
}
