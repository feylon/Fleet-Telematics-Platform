export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotificationJob {
  organizationId: string;
  vehicleId: string;
  alertType: string;
  severity: string;
  details: string;
  timestamp: string;
  latitude: number;
  longitude: number;
}

export const URGENT_ALERT_TYPES = new Set(['SOS', 'GEOFENCE_EXIT', 'GEOFENCE_ENTER', 'FUEL_DROP']);

export const isUrgent = (alert: { alertType: string; severity: string }): boolean => alert.severity === 'CRITICAL' || URGENT_ALERT_TYPES.has(alert.alertType);
