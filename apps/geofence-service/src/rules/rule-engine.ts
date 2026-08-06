import { AlertMessage, AlertTypeName, distanceToPolylineKm, LngLat, pointInAnyRing, SeverityName, TelemetryMessage } from '@fleet/common';

export interface GeofenceRule {
  id: string;
  name: string;
  rings: LngLat[][];
  speedLimitKmh: number | null;
  allowedFrom: string | null;
  allowedTo: string | null;
  alertOnEnter: boolean;
  alertOnExit: boolean;
}

export interface RouteRule {
  orderId: string;
  polyline: LngLat[];
  deviationThresholdKm: number;
}

export interface VehicleRule {
  maxSpeedKmh: number;
  fuelDropAlertFraction: number;
  plateNumber: string;
}

export interface VehicleState {
  lastTimestamp: string | null;
  lastSpeed: number;
  lastFuelLevel: number;
  insideGeofenceIds: string[];
  stopSince: string | null;
  lastAlertAt: Partial<Record<string, string>>;
}

export interface EvaluationContext {
  geofences: GeofenceRule[];
  route: RouteRule | null;
  vehicle: VehicleRule;
  now: Date;
  timezoneOffsetMinutes: number;
}

export interface EvaluationResult {
  alerts: AlertMessage[];
  state: VehicleState;
}

export const Thresholds = {
  speedToleranceKmh: 5,
  criticalSpeedFactor: 1.3,
  harshBrakeMs2: 4,
  harshBrakeMaxGapSeconds: 15,
  fuelDropMaxGapSeconds: 600,
  stopSpeedKmh: 1,
  unauthorizedStopMinutes: 10,
  cooldownSeconds: {
    SOS: 60,
    SPEEDING: 60,
    HARSH_BRAKE: 30,
    FUEL_DROP: 600,
    UNAUTHORIZED_STOP: 1800,
    ROUTE_DEVIATION: 300,
    TIME_WINDOW_VIOLATION: 600,
    GEOFENCE_ENTER: 0,
    GEOFENCE_EXIT: 0,
  } as Record<AlertTypeName, number>,
};

export const emptyState = (): VehicleState => ({ lastTimestamp: null, lastSpeed: 0, lastFuelLevel: 0, insideGeofenceIds: [], stopSince: null, lastAlertAt: {} });

const minutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
};

export const withinWindow = (utc: Date, from: string, to: string, offsetMinutes: number): boolean => {
  const local = (((utc.getUTCHours() * 60 + utc.getUTCMinutes() + offsetMinutes) % 1440) + 1440) % 1440;
  const start = minutesOfDay(from);
  const end = minutesOfDay(to);
  if (start <= end) return local >= start && local <= end;
  return local >= start || local <= end;
};

export const evaluate = (ping: TelemetryMessage, previous: VehicleState, context: EvaluationContext): EvaluationResult => {
  const alerts: AlertMessage[] = [];
  const lastAlertAt: Partial<Record<string, string>> = { ...previous.lastAlertAt };
  const pingTime = new Date(ping.timestamp);
  const point = { latitude: ping.latitude, longitude: ping.longitude };

  const allowed = (type: AlertTypeName, key: string = type): boolean => {
    const cooldown = Thresholds.cooldownSeconds[type];
    const last = lastAlertAt[key];
    if (last && cooldown > 0 && pingTime.getTime() - new Date(last).getTime() < cooldown * 1000) return false;
    lastAlertAt[key] = ping.timestamp;
    return true;
  };

  const push = (alertType: AlertTypeName, severity: SeverityName, details: string, extra: Partial<AlertMessage> = {}): void => {
    alerts.push({ organizationId: ping.organizationId, vehicleId: ping.vehicleId, timestamp: ping.timestamp, alertType, severity, details, latitude: ping.latitude, longitude: ping.longitude, ...extra });
  };

  const insideNow = context.geofences.filter((geofence) => pointInAnyRing(point, geofence.rings));
  const insideIds = insideNow.map((geofence) => geofence.id);
  const previousInside = new Set(previous.insideGeofenceIds);
  const knownIds = new Set(context.geofences.map((geofence) => geofence.id));

  for (const geofence of insideNow) {
    if (!previousInside.has(geofence.id) && geofence.alertOnEnter && previous.lastTimestamp !== null && allowed('GEOFENCE_ENTER', `GEOFENCE_ENTER:${geofence.id}`)) {
      push('GEOFENCE_ENTER', 'INFO', `${context.vehicle.plateNumber} entered ${geofence.name}`, { geofenceId: geofence.id });
    }
  }
  for (const geofence of context.geofences) {
    if (previousInside.has(geofence.id) && !insideIds.includes(geofence.id) && geofence.alertOnExit && allowed('GEOFENCE_EXIT', `GEOFENCE_EXIT:${geofence.id}`)) {
      push('GEOFENCE_EXIT', 'WARNING', `${context.vehicle.plateNumber} left ${geofence.name}`, { geofenceId: geofence.id });
    }
  }
  const retainedInside = previous.insideGeofenceIds.filter((id) => !knownIds.has(id));

  if (ping.sos && allowed('SOS')) {
    push('SOS', 'CRITICAL', `SOS pressed in ${context.vehicle.plateNumber}`);
  }

  const geofenceLimits = insideNow.map((geofence) => geofence.speedLimitKmh).filter((limit): limit is number => limit !== null && limit > 0);
  const limit = Math.min(context.vehicle.maxSpeedKmh, ...geofenceLimits);
  if (ping.speed > limit + Thresholds.speedToleranceKmh && allowed('SPEEDING')) {
    const severity: SeverityName = ping.speed > limit * Thresholds.criticalSpeedFactor ? 'CRITICAL' : 'WARNING';
    push('SPEEDING', severity, `${context.vehicle.plateNumber} at ${ping.speed.toFixed(0)} km/h, limit ${limit} km/h`);
  }

  for (const geofence of insideNow) {
    if (geofence.allowedFrom && geofence.allowedTo && !withinWindow(pingTime, geofence.allowedFrom, geofence.allowedTo, context.timezoneOffsetMinutes) && allowed('TIME_WINDOW_VIOLATION', `TIME_WINDOW_VIOLATION:${geofence.id}`)) {
      push('TIME_WINDOW_VIOLATION', 'WARNING', `${context.vehicle.plateNumber} inside ${geofence.name} outside allowed hours ${geofence.allowedFrom}-${geofence.allowedTo}`, { geofenceId: geofence.id });
    }
  }

  if (previous.lastTimestamp) {
    const gapSeconds = (pingTime.getTime() - new Date(previous.lastTimestamp).getTime()) / 1000;
    if (gapSeconds > 0 && gapSeconds <= Thresholds.harshBrakeMaxGapSeconds) {
      const decelerationMs2 = ((previous.lastSpeed - ping.speed) / 3.6) / gapSeconds;
      if (decelerationMs2 >= Thresholds.harshBrakeMs2 && allowed('HARSH_BRAKE')) {
        push('HARSH_BRAKE', 'WARNING', `${context.vehicle.plateNumber} braked from ${previous.lastSpeed.toFixed(0)} to ${ping.speed.toFixed(0)} km/h in ${gapSeconds.toFixed(0)} s`);
      }
    }
    if (gapSeconds > 0 && gapSeconds <= Thresholds.fuelDropMaxGapSeconds && ping.speed <= 3 && previous.lastFuelLevel > 0) {
      const drop = previous.lastFuelLevel - ping.fuelLevel;
      if (drop >= context.vehicle.fuelDropAlertFraction * 100 && allowed('FUEL_DROP')) {
        push('FUEL_DROP', 'CRITICAL', `${context.vehicle.plateNumber} fuel dropped ${drop.toFixed(0)} points while stationary`);
      }
    }
  }

  let stopSince = previous.stopSince;
  const stopped = ping.ignitionOn && ping.speed <= Thresholds.stopSpeedKmh;
  if (!stopped || insideIds.length > 0) {
    stopSince = null;
  } else {
    stopSince = stopSince ?? ping.timestamp;
    const stoppedMinutes = (pingTime.getTime() - new Date(stopSince).getTime()) / 60000;
    if (stoppedMinutes >= Thresholds.unauthorizedStopMinutes && allowed('UNAUTHORIZED_STOP')) {
      push('UNAUTHORIZED_STOP', 'WARNING', `${context.vehicle.plateNumber} stopped with engine running for ${stoppedMinutes.toFixed(0)} min outside any geofence`);
    }
  }

  if (context.route && context.route.polyline.length > 1) {
    const distance = distanceToPolylineKm(point, context.route.polyline);
    if (distance > context.route.deviationThresholdKm && allowed('ROUTE_DEVIATION')) {
      push('ROUTE_DEVIATION', 'WARNING', `${context.vehicle.plateNumber} is ${distance.toFixed(2)} km off the assigned route`, { orderId: context.route.orderId });
    }
  }

  return {
    alerts,
    state: {
      lastTimestamp: ping.timestamp,
      lastSpeed: ping.speed,
      lastFuelLevel: ping.fuelLevel,
      insideGeofenceIds: [...insideIds, ...retainedInside],
      stopSince,
      lastAlertAt,
    },
  };
};
