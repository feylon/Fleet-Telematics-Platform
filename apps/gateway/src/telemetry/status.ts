export type VehicleLiveStatus = 'MOVING' | 'IDLE' | 'OFFLINE' | 'EMERGENCY';

export interface LastPing {
  vehicleId: string;
  organizationId: string;
  imei: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  fuelLevel: number;
  engineTemp: number;
  ignitionOn: boolean;
  isMoving: boolean;
  sos: boolean;
  sosAt?: string | null;
  receivedAt: string;
}

export const OFFLINE_AFTER_MS = 5 * 60 * 1000;
export const EMERGENCY_WINDOW_MS = 10 * 60 * 1000;
export const MOVING_SPEED_KMH = 3;

export const deriveStatus = (ping: LastPing | null, now: Date): VehicleLiveStatus => {
  if (!ping) return 'OFFLINE';
  const age = now.getTime() - new Date(ping.receivedAt).getTime();
  const sosAge = ping.sosAt ? now.getTime() - new Date(ping.sosAt).getTime() : Number.POSITIVE_INFINITY;
  if (ping.sos || sosAge <= EMERGENCY_WINDOW_MS) return 'EMERGENCY';
  if (age > OFFLINE_AFTER_MS) return 'OFFLINE';
  if (ping.isMoving || ping.speed > MOVING_SPEED_KMH) return 'MOVING';
  return 'IDLE';
};
