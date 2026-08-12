import { useApi } from './useApi';
import { useTenant } from './useTenant';
import type { Paged } from './useFleetApi';

export const useOrdersApi = () => {
  const api = useApi();
  const { withTenant } = useTenant();

  return {
    list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/orders', withTenant(query)),
    get: (id: string) => api.get<Record<string, any>>(`/api/orders/${id}`, withTenant()),
    create: (body: unknown) => api.post<Record<string, any>>('/api/orders', body, withTenant()),
    update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/orders/${id}`, body, withTenant()),
    assign: (id: string, vehicleId: string, driverId?: string) => api.put<Record<string, any>>(`/api/orders/${id}/assign`, { vehicleId, driverId: driverId || undefined }, withTenant()),
    transition: (id: string, status: string) => api.put<Record<string, any>>(`/api/orders/${id}/status`, { status }, withTenant()),
    setRoute: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/orders/${id}/route`, body, withTenant()),
    reach: (id: string, checkpointId: string) => api.put<Record<string, any>>(`/api/orders/${id}/checkpoints/${checkpointId}/reach`, undefined, withTenant()),
    remove: (id: string) => api.del(`/api/orders/${id}`, withTenant()),
    nearby: (latitude: number, longitude: number, radiusKm = 25, limit = 10) => api.get<{ items: Record<string, any>[] }>('/api/orders/nearby', withTenant({ latitude, longitude, radiusKm, limit })),
    driver: {
      me: () => api.get<Record<string, any>>('/api/mobile/driver/me'),
      orders: () => api.get<Paged<Record<string, any>>>('/api/mobile/driver/orders'),
      today: () => api.get<{ items: Record<string, any>[] }>('/api/mobile/driver/orders/today'),
      transition: (id: string, status: string) => api.put<Record<string, any>>(`/api/mobile/driver/orders/${id}/status`, { status }),
      reach: (id: string, checkpointId: string) => api.put<Record<string, any>>(`/api/mobile/driver/orders/${id}/checkpoints/${checkpointId}/reach`),
      stats: (query: Record<string, unknown> = {}) => api.get<Record<string, any>>('/api/mobile/driver/stats', query),
    },
  };
};
