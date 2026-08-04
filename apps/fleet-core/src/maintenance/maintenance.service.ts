import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { dateOrNull, isoOrEmpty, numberOrZero, pageOf, rpcInvalid, rpcNotFound, stringOrEmpty, zeroToNull } from '@fleet/common';
import { FuelNorm, MaintenanceLog, MaintenanceType, Vehicle, VehicleStatus } from '@fleet/database';
import { FleetEventsProducer } from '../events/fleet-events.producer';
import { computeDue } from './maintenance-due';

export interface MaintenanceInput {
  organizationId: string;
  vehicleId: string;
  type: string;
  description: string;
  costAmount?: string;
  odometerKm?: number;
  performedAt?: string;
  nextDueAt?: string;
  nextDueOdometerKm?: number;
  downtimeFrom?: string;
  downtimeTo?: string;
  performedById?: string;
  markOutOfService?: boolean;
}

export interface FuelNormInput {
  vehicleId: string;
  organizationId: string;
  litersPer100km: number;
  winterCoefficient?: number;
  cityCoefficient?: number;
  fuelDropAlertFraction?: number;
}

const toLogMessage = (log: MaintenanceLog, plateNumber?: string | null) => ({
  id: log.id,
  organizationId: log.organizationId,
  vehicleId: log.vehicleId,
  type: log.type,
  description: log.description,
  costAmount: stringOrEmpty(log.costAmount),
  odometerKm: numberOrZero(log.odometerKm),
  performedAt: isoOrEmpty(log.performedAt),
  nextDueAt: isoOrEmpty(log.nextDueAt),
  nextDueOdometerKm: numberOrZero(log.nextDueOdometerKm),
  downtimeFrom: isoOrEmpty(log.downtimeFrom),
  downtimeTo: isoOrEmpty(log.downtimeTo),
  performedById: stringOrEmpty(log.performedById),
  createdAt: isoOrEmpty(log.createdAt),
  plateNumber: stringOrEmpty(plateNumber),
});

const toFuelNormMessage = (norm: FuelNorm) => ({
  vehicleId: norm.vehicleId,
  organizationId: norm.organizationId,
  litersPer100km: norm.litersPer100Km,
  winterCoefficient: norm.winterCoefficient,
  cityCoefficient: norm.cityCoefficient,
  fuelDropAlertFraction: norm.fuelDropAlertFraction,
});

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceLog) private readonly logs: Repository<MaintenanceLog>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(FuelNorm) private readonly norms: Repository<FuelNorm>,
    private readonly events: FleetEventsProducer,
  ) {}

  async create(input: MaintenanceInput) {
    if (!input.organizationId || !input.vehicleId) throw rpcInvalid('organizationId and vehicleId are required');
    if (!(Object.values(MaintenanceType) as string[]).includes(input.type)) throw rpcInvalid('Unknown maintenance type');
    if (!input.description || input.description.trim().length < 3) throw rpcInvalid('description is required');
    const vehicle = await this.vehicles.findOne({ where: { id: input.vehicleId, organizationId: input.organizationId } });
    if (!vehicle) throw rpcNotFound('Vehicle not found');
    const performedAt = dateOrNull(input.performedAt) ?? new Date();
    const saved = await this.logs.save(
      this.logs.create({
        organizationId: input.organizationId,
        vehicleId: input.vehicleId,
        type: input.type as MaintenanceType,
        description: input.description.trim(),
        costAmount: input.costAmount && input.costAmount !== '' ? input.costAmount : '0',
        odometerKm: zeroToNull(input.odometerKm),
        performedAt,
        nextDueAt: dateOrNull(input.nextDueAt),
        nextDueOdometerKm: zeroToNull(input.nextDueOdometerKm),
        downtimeFrom: dateOrNull(input.downtimeFrom),
        downtimeTo: dateOrNull(input.downtimeTo),
        performedById: input.performedById || null,
      }),
    );
    let vehicleChanged = false;
    if (input.odometerKm && input.odometerKm > vehicle.odometerKm) {
      vehicle.odometerKm = input.odometerKm;
      vehicleChanged = true;
    }
    if (input.type === MaintenanceType.INSPECTION) {
      vehicle.nextInspectionAt = dateOrNull(input.nextDueAt);
      vehicle.nextInspectionOdometerKm = zeroToNull(input.nextDueOdometerKm);
      vehicleChanged = true;
    }
    if (input.markOutOfService) {
      vehicle.status = VehicleStatus.MAINTENANCE;
      vehicleChanged = true;
    } else if (vehicle.status === VehicleStatus.MAINTENANCE && input.downtimeTo && dateOrNull(input.downtimeTo)!.getTime() <= Date.now()) {
      vehicle.status = VehicleStatus.ACTIVE;
      vehicleChanged = true;
    }
    if (vehicleChanged) {
      await this.vehicles.save(vehicle);
      await this.events.emit(vehicle.organizationId, 'vehicle.changed', vehicle.id, { action: 'maintenance' });
    }
    return toLogMessage(saved, vehicle.plateNumber);
  }

  async list(request: { organizationId: string; vehicleId?: string; pagination?: { page?: number; pageSize?: number } }) {
    const { page, pageSize, skip, take } = pageOf(request.pagination);
    const where = { organizationId: request.organizationId, ...(request.vehicleId ? { vehicleId: request.vehicleId } : {}) };
    const [rows, total] = await this.logs.findAndCount({ where, order: { performedAt: 'DESC' }, skip, take });
    const vehicleIds = [...new Set(rows.map((row) => row.vehicleId))];
    const vehicles = vehicleIds.length ? await this.vehicles.find({ where: { id: In(vehicleIds) } }) : [];
    const plates = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plateNumber]));
    return { items: rows.map((row) => toLogMessage(row, plates.get(row.vehicleId))), meta: { page, pageSize, total } };
  }

  async delete(id: string, organizationId: string) {
    const log = await this.logs.findOne({ where: { id, organizationId } });
    if (!log) throw rpcNotFound('Maintenance record not found');
    await this.logs.delete(log.id);
    return { deleted: true };
  }

  async due(organizationId: string) {
    const vehicles = await this.vehicles.find({ where: { organizationId } });
    const lastServices = await this.logs
      .createQueryBuilder('log')
      .select('log.vehicleId', 'vehicleId')
      .addSelect('MAX(log.odometerKm)', 'odometer')
      .where('log.organizationId = :organizationId', { organizationId })
      .andWhere('log.type IN (:...types)', { types: [MaintenanceType.OIL_CHANGE, MaintenanceType.INSPECTION, MaintenanceType.REPAIR] })
      .groupBy('log.vehicleId')
      .getRawMany<{ vehicleId: string; odometer: string | null }>();
    const lastByVehicle = new Map(lastServices.map((row) => [row.vehicleId, row.odometer === null ? null : Number(row.odometer)]));
    const items = computeDue(
      vehicles.map((vehicle) => ({
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        odometerKm: vehicle.odometerKm,
        maintenanceIntervalKm: vehicle.maintenanceIntervalKm,
        nextInspectionAt: vehicle.nextInspectionAt,
        nextInspectionOdometerKm: vehicle.nextInspectionOdometerKm,
        lastServiceOdometerKm: lastByVehicle.get(vehicle.id) ?? null,
      })),
      new Date(),
    );
    return { items };
  }

  async upsertFuelNorm(input: FuelNormInput) {
    if (!input.organizationId || !input.vehicleId) throw rpcInvalid('organizationId and vehicleId are required');
    if (!input.litersPer100km || input.litersPer100km <= 0) throw rpcInvalid('litersPer100km must be positive');
    const vehicle = await this.vehicles.findOne({ where: { id: input.vehicleId, organizationId: input.organizationId } });
    if (!vehicle) throw rpcNotFound('Vehicle not found');
    const existing = (await this.norms.findOne({ where: { vehicleId: input.vehicleId } })) ?? this.norms.create({ vehicleId: input.vehicleId, organizationId: input.organizationId });
    existing.litersPer100Km = input.litersPer100km;
    if (input.winterCoefficient && input.winterCoefficient > 0) existing.winterCoefficient = input.winterCoefficient;
    if (input.cityCoefficient && input.cityCoefficient > 0) existing.cityCoefficient = input.cityCoefficient;
    if (input.fuelDropAlertFraction && input.fuelDropAlertFraction > 0) existing.fuelDropAlertFraction = input.fuelDropAlertFraction;
    const saved = await this.norms.save(existing);
    await this.events.emit(input.organizationId, 'vehicle.changed', input.vehicleId, { action: 'fuel-norm' });
    return toFuelNormMessage(saved);
  }

  async getFuelNorm(vehicleId: string, organizationId: string) {
    const norm = await this.norms.findOne({ where: { vehicleId, organizationId } });
    if (!norm) return { vehicleId, organizationId, litersPer100km: 0, winterCoefficient: 1.1, cityCoefficient: 1.15, fuelDropAlertFraction: 0.2 };
    return toFuelNormMessage(norm);
  }
}
