import { computeDue } from './maintenance-due';

const now = new Date('2026-08-01T00:00:00Z');

describe('computeDue', () => {
  it('flags an inspection date within fourteen days', () => {
    const items = computeDue([{ id: 'v', plateNumber: 'P', odometerKm: 1000, maintenanceIntervalKm: 10000, nextInspectionAt: new Date('2026-08-10T00:00:00Z'), nextInspectionOdometerKm: null, lastServiceOdometerKm: 0 }], now);
    expect(items.map((i) => i.reason)).toEqual(['INSPECTION_DATE']);
  });

  it('flags odometer thresholds within 500 km and service intervals', () => {
    const items = computeDue([{ id: 'v', plateNumber: 'P', odometerKm: 19600, maintenanceIntervalKm: 10000, nextInspectionAt: null, nextInspectionOdometerKm: 20000, lastServiceOdometerKm: 10000 }], now);
    expect(items.map((i) => i.reason).sort()).toEqual(['INSPECTION_ODOMETER', 'SERVICE_INTERVAL']);
    expect(items.find((i) => i.reason === 'SERVICE_INTERVAL')?.dueOdometerKm).toBe(20000);
  });

  it('returns nothing when everything is far away', () => {
    const items = computeDue([{ id: 'v', plateNumber: 'P', odometerKm: 1000, maintenanceIntervalKm: 10000, nextInspectionAt: new Date('2027-01-01T00:00:00Z'), nextInspectionOdometerKm: 50000, lastServiceOdometerKm: 0 }], now);
    expect(items).toEqual([]);
  });
});
