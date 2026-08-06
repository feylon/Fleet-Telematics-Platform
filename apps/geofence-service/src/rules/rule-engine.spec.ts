import { TelemetryMessage } from '@fleet/common';
import { emptyState, evaluate, EvaluationContext, GeofenceRule, VehicleState, withinWindow } from './rule-engine';

const square: GeofenceRule = {
  id: 'g1',
  name: 'Depot',
  rings: [
    [
      [69.2, 41.3],
      [69.3, 41.3],
      [69.3, 41.4],
      [69.2, 41.4],
      [69.2, 41.3],
    ],
  ],
  speedLimitKmh: 40,
  allowedFrom: null,
  allowedTo: null,
  alertOnEnter: true,
  alertOnExit: true,
};

const context = (overrides: Partial<EvaluationContext> = {}): EvaluationContext => ({
  geofences: [square],
  route: null,
  vehicle: { maxSpeedKmh: 90, fuelDropAlertFraction: 0.2, plateNumber: '01A123BC' },
  now: new Date('2026-08-01T05:00:00Z'),
  timezoneOffsetMinutes: 300,
  ...overrides,
});

const ping = (overrides: Partial<TelemetryMessage>): TelemetryMessage => ({
  organizationId: 'o',
  vehicleId: 'v',
  imei: '1',
  timestamp: '2026-08-01T05:00:00.000Z',
  latitude: 41.35,
  longitude: 69.25,
  speed: 20,
  altitude: 0,
  heading: 0,
  fuelLevel: 50,
  engineTemp: 80,
  ignitionOn: true,
  isMoving: true,
  sos: false,
  ...overrides,
});

const later = (seconds: number): string => new Date(Date.parse('2026-08-01T05:00:00.000Z') + seconds * 1000).toISOString();

const stateAfter = (p: TelemetryMessage, previous: VehicleState = emptyState()): VehicleState => evaluate(p, previous, context()).state;

describe('rule engine', () => {
  it('raises SOS as critical', () => {
    const { alerts } = evaluate(ping({ sos: true }), emptyState(), context());
    expect(alerts.map((a) => [a.alertType, a.severity])).toContainEqual(['SOS', 'CRITICAL']);
  });

  it('applies the geofence speed limit when inside and vehicle limit when outside', () => {
    const inside = evaluate(ping({ speed: 50 }), emptyState(), context());
    expect(inside.alerts.map((a) => a.alertType)).toContain('SPEEDING');
    const outside = evaluate(ping({ speed: 50, latitude: 41.5 }), emptyState(), context());
    expect(outside.alerts.map((a) => a.alertType)).not.toContain('SPEEDING');
    const critical = evaluate(ping({ speed: 130, latitude: 41.5 }), emptyState(), context());
    expect(critical.alerts.find((a) => a.alertType === 'SPEEDING')?.severity).toBe('CRITICAL');
  });

  it('respects the speeding cooldown', () => {
    const first = evaluate(ping({ speed: 60 }), emptyState(), context());
    const second = evaluate(ping({ speed: 60, timestamp: later(10) }), first.state, context());
    const third = evaluate(ping({ speed: 60, timestamp: later(70) }), second.state, context());
    expect(first.alerts.some((a) => a.alertType === 'SPEEDING')).toBe(true);
    expect(second.alerts.some((a) => a.alertType === 'SPEEDING')).toBe(false);
    expect(third.alerts.some((a) => a.alertType === 'SPEEDING')).toBe(true);
  });

  it('emits exit and enter when crossing the boundary and nothing when staying on the edge', () => {
    const insideState = stateAfter(ping({}));
    expect(insideState.insideGeofenceIds).toEqual(['g1']);
    const exit = evaluate(ping({ latitude: 41.5, timestamp: later(5) }), insideState, context());
    expect(exit.alerts.map((a) => a.alertType)).toEqual(['GEOFENCE_EXIT']);
    const reenter = evaluate(ping({ timestamp: later(10) }), exit.state, context());
    expect(reenter.alerts.map((a) => a.alertType)).toEqual(['GEOFENCE_ENTER']);
    const onVertex = evaluate(ping({ latitude: 41.3, longitude: 69.2, timestamp: later(15) }), reenter.state, context());
    expect(onVertex.alerts).toEqual([]);
    expect(onVertex.state.insideGeofenceIds).toEqual(['g1']);
    const onEdge = evaluate(ping({ latitude: 41.3, longitude: 69.25, timestamp: later(20) }), onVertex.state, context());
    expect(onEdge.alerts).toEqual([]);
  });

  it('does not emit enter for the very first ping of a vehicle', () => {
    const { alerts } = evaluate(ping({}), emptyState(), context());
    expect(alerts.map((a) => a.alertType)).not.toContain('GEOFENCE_ENTER');
  });

  it('detects harsh braking from the speed delta', () => {
    const previous = stateAfter(ping({ speed: 70, latitude: 41.5 }));
    const { alerts } = evaluate(ping({ speed: 10, latitude: 41.5, timestamp: later(3) }), previous, context());
    expect(alerts.map((a) => a.alertType)).toContain('HARSH_BRAKE');
  });

  it('detects a fuel drop while stationary but not while driving', () => {
    const previous = stateAfter(ping({ speed: 0, fuelLevel: 80, latitude: 41.5 }));
    const stationary = evaluate(ping({ speed: 0, fuelLevel: 50, latitude: 41.5, timestamp: later(120) }), previous, context());
    expect(stationary.alerts.find((a) => a.alertType === 'FUEL_DROP')?.severity).toBe('CRITICAL');
    const driving = evaluate(ping({ speed: 60, fuelLevel: 50, latitude: 41.5, timestamp: later(120) }), previous, context());
    expect(driving.alerts.map((a) => a.alertType)).not.toContain('FUEL_DROP');
  });

  it('flags an unauthorized stop after ten minutes outside geofences', () => {
    let state = stateAfter(ping({ speed: 0, latitude: 41.5 }));
    expect(state.stopSince).toBe('2026-08-01T05:00:00.000Z');
    const early = evaluate(ping({ speed: 0, latitude: 41.5, timestamp: later(300) }), state, context());
    expect(early.alerts).toEqual([]);
    state = early.state;
    const late = evaluate(ping({ speed: 0, latitude: 41.5, timestamp: later(660) }), state, context());
    expect(late.alerts.map((a) => a.alertType)).toEqual(['UNAUTHORIZED_STOP']);
    const moved = evaluate(ping({ speed: 30, latitude: 41.5, timestamp: later(700) }), late.state, context());
    expect(moved.state.stopSince).toBeNull();
  });

  it('flags route deviation beyond the threshold', () => {
    const route = { orderId: 'ord', polyline: [[69.2, 41.5], [69.3, 41.5]] as [number, number][], deviationThresholdKm: 0.5 };
    const onRoute = evaluate(ping({ latitude: 41.5, longitude: 69.25 }), emptyState(), context({ route }));
    expect(onRoute.alerts.map((a) => a.alertType)).not.toContain('ROUTE_DEVIATION');
    const off = evaluate(ping({ latitude: 41.52, longitude: 69.25 }), emptyState(), context({ route }));
    expect(off.alerts.find((a) => a.alertType === 'ROUTE_DEVIATION')?.orderId).toBe('ord');
  });

  it('flags presence inside a geofence outside its allowed hours', () => {
    const night: GeofenceRule = { ...square, id: 'g2', name: 'Night zone', allowedFrom: '08:00', allowedTo: '18:00' };
    const atTen = evaluate(ping({}), emptyState(), context({ geofences: [night] }));
    expect(atTen.alerts.map((a) => a.alertType)).not.toContain('TIME_WINDOW_VIOLATION');
    const atTwentyTwo = evaluate(ping({ timestamp: '2026-08-01T17:00:00.000Z' }), emptyState(), context({ geofences: [night] }));
    expect(atTwentyTwo.alerts.map((a) => a.alertType)).toContain('TIME_WINDOW_VIOLATION');
  });
});

describe('withinWindow', () => {
  it('handles windows crossing midnight', () => {
    expect(withinWindow(new Date('2026-08-01T20:00:00Z'), '22:00', '06:00', 300)).toBe(true);
    expect(withinWindow(new Date('2026-08-01T07:00:00Z'), '22:00', '06:00', 300)).toBe(false);
  });
});
