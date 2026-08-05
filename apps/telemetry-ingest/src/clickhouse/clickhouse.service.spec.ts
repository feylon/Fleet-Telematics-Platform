import { toAlertRow, toTelemetryRow } from './clickhouse.service';

describe('ClickHouse row mapping', () => {
  it('maps a telemetry message to the vehicle_telemetry schema', () => {
    const row = toTelemetryRow({
      organizationId: 'o',
      vehicleId: 'v',
      imei: '1',
      timestamp: '2026-08-01T10:00:00.250Z',
      latitude: 41.3,
      longitude: 69.2,
      speed: 55.5,
      altitude: 400,
      heading: 90,
      fuelLevel: 60,
      engineTemp: 85,
      ignitionOn: true,
      isMoving: true,
      sos: false,
    });
    expect(row).toEqual({
      timestamp: '2026-08-01 10:00:00.250',
      organization_id: 'o',
      vehicle_id: 'v',
      imei: '1',
      latitude: 41.3,
      longitude: 69.2,
      speed: 55.5,
      altitude: 400,
      heading: 90,
      fuel_level: 60,
      engine_temp: 85,
      ignition_on: 1,
      is_moving: 1,
      sos: 0,
    });
  });

  it('maps an alert with optional ids defaulting to empty strings', () => {
    const row = toAlertRow({ organizationId: 'o', vehicleId: 'v', timestamp: '2026-08-01T10:00:00.000Z', alertType: 'SPEEDING', severity: 'WARNING', details: 'x', latitude: 1, longitude: 2 });
    expect(row.geofence_id).toBe('');
    expect(row.order_id).toBe('');
    expect(row.alert_type).toBe('SPEEDING');
  });
});
