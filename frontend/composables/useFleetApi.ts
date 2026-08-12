import { useApi } from './useApi';
import { useTenant } from './useTenant';

export interface GeofenceItem {
  id: string;
  name: string;
  description: string;
  color: string;
  polygon: { type: 'Polygon'; coordinates: number[][][] };
  speedLimitKmh: number;
  allowedFrom: string;
  allowedTo: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  isActive: boolean;
}

export interface Paged<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number };
}

export const useFleetApi = () => {
  const api = useApi();
  const { withTenant } = useTenant();

  return {
    vehicles: {
      list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/fleet/vehicles', withTenant(query)),
      get: (id: string) => api.get<Record<string, any>>(`/api/fleet/vehicles/${id}`, withTenant()),
      create: (body: unknown) => api.post<Record<string, any>>('/api/fleet/vehicles', body, withTenant()),
      update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/fleet/vehicles/${id}`, body, withTenant()),
      setStatus: (id: string, status: string) => api.put<Record<string, any>>(`/api/fleet/vehicles/${id}/status`, { status }, withTenant()),
      remove: (id: string) => api.del(`/api/fleet/vehicles/${id}`, withTenant()),
    },
    devices: {
      list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/fleet/devices', withTenant(query)),
      create: (body: unknown) => api.post<{ device: Record<string, any>; token: string }>('/api/fleet/devices', body, withTenant()),
      update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/fleet/devices/${id}`, body, withTenant()),
      rotate: (id: string) => api.post<{ device: Record<string, any>; token: string }>(`/api/fleet/devices/${id}/rotate-token`, undefined, withTenant()),
      remove: (id: string) => api.del(`/api/fleet/devices/${id}`, withTenant()),
    },
    drivers: {
      list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/fleet/drivers', withTenant(query)),
      create: (body: unknown) => api.post<Record<string, any>>('/api/fleet/drivers', body, withTenant()),
      update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/fleet/drivers/${id}`, body, withTenant()),
      assign: (id: string, vehicleId: string | null) => api.put<Record<string, any>>(`/api/fleet/drivers/${id}/vehicle`, { vehicleId: vehicleId ?? undefined }, withTenant()),
      remove: (id: string) => api.del(`/api/fleet/drivers/${id}`, withTenant()),
    },
    maintenance: {
      list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/fleet/maintenance', withTenant(query)),
      due: () => api.get<{ items: Record<string, any>[] }>('/api/fleet/maintenance/due', withTenant()),
      create: (body: unknown) => api.post<Record<string, any>>('/api/fleet/maintenance', body, withTenant()),
      remove: (id: string) => api.del(`/api/fleet/maintenance/${id}`, withTenant()),
      fuelNorm: (vehicleId: string) => api.get<Record<string, any>>(`/api/fleet/maintenance/fuel-norms/${vehicleId}`, withTenant()),
      setFuelNorm: (vehicleId: string, body: unknown) => api.put<Record<string, any>>(`/api/fleet/maintenance/fuel-norms/${vehicleId}`, body, withTenant()),
    },
    live: {
      vehicles: () => api.get<Record<string, any>[]>('/api/live/vehicles', withTenant()),
      recentAlerts: (limit = 100) => api.get<Record<string, any>[]>('/api/live/alerts/recent', withTenant({ limit })),
    },
    geofences: {
      list: (onlyActive = false) => api.get<{ items: GeofenceItem[] }>('/api/geofences', withTenant({ onlyActive })),
      create: (body: unknown) => api.post<Record<string, any>>('/api/geofences', body, withTenant()),
      update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/geofences/${id}`, body, withTenant()),
      remove: (id: string) => api.del(`/api/geofences/${id}`, withTenant()),
      vehicleState: (vehicleId: string) => api.get<{ insideGeofenceIds: string[] }>(`/api/geofences/vehicle-state/${vehicleId}`, withTenant()),
    },
  };
};
