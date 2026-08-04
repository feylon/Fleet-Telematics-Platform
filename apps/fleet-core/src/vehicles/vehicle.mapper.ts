import { isoOrEmpty, numberOrZero, stringOrEmpty, emptyToNull, dateOrNull, zeroToNull } from '@fleet/common';
import { FuelType, Vehicle, VehicleStatus } from '@fleet/database';

export interface VehicleInput {
  organizationId: string;
  plateNumber: string;
  vin?: string;
  brand: string;
  model: string;
  year?: number;
  fuelType?: string;
  fuelTankCapacity?: number;
  odometerKm?: number;
  maxSpeedKmh?: number;
  status?: string;
  maintenanceIntervalKm?: number;
  nextInspectionAt?: string;
  nextInspectionOdometerKm?: number;
  color?: string;
  iconType?: string;
}

export interface VehicleExtras {
  imei?: string | null;
  driverId?: string | null;
  driverName?: string | null;
}

export const toVehicleMessage = (vehicle: Vehicle, extras: VehicleExtras = {}) => ({
  id: vehicle.id,
  organizationId: vehicle.organizationId,
  plateNumber: vehicle.plateNumber,
  vin: stringOrEmpty(vehicle.vin),
  brand: vehicle.brand,
  model: vehicle.model,
  year: numberOrZero(vehicle.year),
  fuelType: vehicle.fuelType,
  fuelTankCapacity: numberOrZero(vehicle.fuelTankCapacity),
  odometerKm: numberOrZero(vehicle.odometerKm),
  maxSpeedKmh: numberOrZero(vehicle.maxSpeedKmh),
  status: vehicle.status,
  maintenanceIntervalKm: numberOrZero(vehicle.maintenanceIntervalKm),
  nextInspectionAt: isoOrEmpty(vehicle.nextInspectionAt),
  nextInspectionOdometerKm: numberOrZero(vehicle.nextInspectionOdometerKm),
  color: stringOrEmpty(vehicle.color),
  iconType: vehicle.iconType,
  createdAt: isoOrEmpty(vehicle.createdAt),
  updatedAt: isoOrEmpty(vehicle.updatedAt),
  imei: stringOrEmpty(extras.imei),
  driverId: stringOrEmpty(extras.driverId),
  driverName: stringOrEmpty(extras.driverName),
});

export const applyVehicleInput = (vehicle: Vehicle, input: VehicleInput): Vehicle => {
  vehicle.organizationId = input.organizationId;
  vehicle.plateNumber = input.plateNumber.trim().toUpperCase();
  vehicle.vin = emptyToNull(input.vin);
  vehicle.brand = input.brand.trim();
  vehicle.model = input.model.trim();
  vehicle.year = zeroToNull(input.year);
  vehicle.fuelType = (Object.values(FuelType) as string[]).includes(input.fuelType ?? '') ? (input.fuelType as FuelType) : vehicle.fuelType ?? FuelType.DIESEL;
  vehicle.fuelTankCapacity = zeroToNull(input.fuelTankCapacity);
  vehicle.odometerKm = numberOrZero(input.odometerKm);
  vehicle.maxSpeedKmh = input.maxSpeedKmh && input.maxSpeedKmh > 0 ? input.maxSpeedKmh : vehicle.maxSpeedKmh ?? 90;
  vehicle.status = (Object.values(VehicleStatus) as string[]).includes(input.status ?? '') ? (input.status as VehicleStatus) : vehicle.status ?? VehicleStatus.ACTIVE;
  vehicle.maintenanceIntervalKm = input.maintenanceIntervalKm && input.maintenanceIntervalKm > 0 ? input.maintenanceIntervalKm : vehicle.maintenanceIntervalKm ?? 10000;
  vehicle.nextInspectionAt = dateOrNull(input.nextInspectionAt);
  vehicle.nextInspectionOdometerKm = zeroToNull(input.nextInspectionOdometerKm);
  vehicle.color = emptyToNull(input.color);
  vehicle.iconType = input.iconType && input.iconType !== '' ? input.iconType : vehicle.iconType ?? 'truck';
  return vehicle;
};
