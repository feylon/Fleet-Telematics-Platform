export interface VehicleForDue {
  id: string;
  plateNumber: string;
  odometerKm: number;
  maintenanceIntervalKm: number;
  nextInspectionAt: Date | null;
  nextInspectionOdometerKm: number | null;
  lastServiceOdometerKm: number | null;
}

export interface DueItem {
  vehicleId: string;
  plateNumber: string;
  reason: 'INSPECTION_DATE' | 'INSPECTION_ODOMETER' | 'SERVICE_INTERVAL';
  dueAt: string;
  dueOdometerKm: number;
  odometerKm: number;
}

export const SOON_DAYS = 14;
export const SOON_KM = 500;

export const computeDue = (vehicles: VehicleForDue[], now: Date): DueItem[] => {
  const items: DueItem[] = [];
  const soonAt = now.getTime() + SOON_DAYS * 86400000;
  for (const vehicle of vehicles) {
    if (vehicle.nextInspectionAt && vehicle.nextInspectionAt.getTime() <= soonAt) {
      items.push({ vehicleId: vehicle.id, plateNumber: vehicle.plateNumber, reason: 'INSPECTION_DATE', dueAt: vehicle.nextInspectionAt.toISOString(), dueOdometerKm: 0, odometerKm: vehicle.odometerKm });
    }
    if (vehicle.nextInspectionOdometerKm !== null && vehicle.nextInspectionOdometerKm - vehicle.odometerKm <= SOON_KM) {
      items.push({ vehicleId: vehicle.id, plateNumber: vehicle.plateNumber, reason: 'INSPECTION_ODOMETER', dueAt: '', dueOdometerKm: vehicle.nextInspectionOdometerKm, odometerKm: vehicle.odometerKm });
    }
    if (vehicle.maintenanceIntervalKm > 0) {
      const base = vehicle.lastServiceOdometerKm ?? 0;
      const nextService = base + vehicle.maintenanceIntervalKm;
      if (nextService - vehicle.odometerKm <= SOON_KM) {
        items.push({ vehicleId: vehicle.id, plateNumber: vehicle.plateNumber, reason: 'SERVICE_INTERVAL', dueAt: '', dueOdometerKm: nextService, odometerKm: vehicle.odometerKm });
      }
    }
  }
  return items;
};
