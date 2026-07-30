export interface TelemetryMessage {
  organizationId: string;
  vehicleId: string;
  imei: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  heading: number;
  fuelLevel: number;
  engineTemp: number;
  ignitionOn: boolean;
  isMoving: boolean;
  sos: boolean;
}

export type AlertTypeName =
  | 'SPEEDING'
  | 'GEOFENCE_EXIT'
  | 'GEOFENCE_ENTER'
  | 'HARSH_BRAKE'
  | 'FUEL_DROP'
  | 'UNAUTHORIZED_STOP'
  | 'ROUTE_DEVIATION'
  | 'SOS'
  | 'TIME_WINDOW_VIOLATION';

export type SeverityName = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertMessage {
  organizationId: string;
  vehicleId: string;
  timestamp: string;
  alertType: AlertTypeName;
  severity: SeverityName;
  details: string;
  latitude: number;
  longitude: number;
  geofenceId?: string;
  orderId?: string;
}

export type FleetEventName =
  | 'geofence.changed'
  | 'vehicle.changed'
  | 'device.changed'
  | 'driver.changed'
  | 'order.changed'
  | 'route.changed'
  | 'branding.changed';

export interface FleetEventMessage {
  organizationId: string;
  event: FleetEventName;
  entityId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
