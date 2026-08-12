import { useApi } from './useApi';
import { useTenant } from './useTenant';
import type { Paged } from './useFleetApi';

export interface SeriesPoint {
  timestamp: string;
  speed: number;
  fuelLevel: number;
  engineTemp: number;
  latitude: number;
  longitude: number;
  heading: number;
  isMoving: boolean;
}

export const useAnalyticsApi = () => {
  const api = useApi();
  const { withTenant } = useTenant();

  return {
    summary: (query: Record<string, unknown> = {}) => api.get<Record<string, number>>('/api/analytics/summary', withTenant(query)),
    series: (vehicleId: string, query: Record<string, unknown> = {}) => api.get<{ points: SeriesPoint[] }>(`/api/analytics/vehicles/${vehicleId}/series`, withTenant(query)),
    track: (vehicleId: string, query: Record<string, unknown> = {}) => api.get<{ points: SeriesPoint[] }>(`/api/analytics/vehicles/${vehicleId}/track`, withTenant(query)),
    driverScores: (query: Record<string, unknown> = {}) => api.get<{ items: Record<string, any>[] }>('/api/analytics/driver-scores', withTenant(query)),
    daily: (query: Record<string, unknown> = {}) => api.get<{ items: Record<string, any>[] }>('/api/analytics/daily', withTenant(query)),
    recompute: (query: Record<string, unknown> = {}) => api.post<{ items: Record<string, any>[] }>('/api/analytics/daily/recompute', undefined, withTenant(query)),
    alerts: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/analytics/alerts', withTenant(query)),
    alertStats: (query: Record<string, unknown> = {}) => api.get<{ items: Array<{ alertType: string; count: number }> }>('/api/analytics/alerts/stats', withTenant(query)),
    heatmap: (query: Record<string, unknown> = {}) => api.get<{ cells: Array<{ latitude: number; longitude: number; weight: number }> }>('/api/analytics/heatmap', withTenant(query)),
    reports: {
      request: (body: unknown) => api.post<Record<string, any>>('/api/analytics/reports', body, withTenant()),
      list: () => api.get<{ items: Record<string, any>[] }>('/api/analytics/reports', withTenant()),
      download: (jobId: string) => api.downloadBlob(`/api/analytics/reports/${jobId}/download`, withTenant()),
    },
  };
};
