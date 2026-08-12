import { useApi } from './useApi';
import type { Paged } from './useFleetApi';

export const useAdminApi = () => {
  const api = useApi();

  return {
    health: () => api.get<Record<string, any>>('/api/admin/system/health'),
    organizations: {
      list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/admin/organizations', query),
      create: (body: unknown) => api.post<Record<string, any>>('/api/admin/organizations', body),
      update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/admin/organizations/${id}`, body),
      remove: (id: string) => api.del(`/api/admin/organizations/${id}`),
    },
    users: {
      list: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/admin/users', query),
      get: (id: string) => api.get<Record<string, any>>(`/api/admin/users/${id}`),
      create: (body: unknown) => api.post<Record<string, any>>('/api/admin/users', body),
      update: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/admin/users/${id}`, body),
      credentials: (id: string, body: unknown) => api.put<Record<string, any>>(`/api/admin/users/${id}/credentials`, body),
      remove: (id: string) => api.del(`/api/admin/users/${id}`),
      loginHistory: (id: string, query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>(`/api/admin/users/${id}/login-history`, query),
      sessions: (id: string) => api.get<Record<string, any>[]>(`/api/admin/users/${id}/sessions`),
      terminate: (id: string) => api.del(`/api/admin/users/${id}/sessions`),
    },
    audit: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/admin/audit-logs', query),
    branding: {
      update: (body: unknown) => api.put<Record<string, any>>('/api/admin/branding', body),
    },
    sessions: {
      mine: () => api.get<Record<string, any>[]>('/api/mobile/sessions'),
      terminate: (id: string) => api.del(`/api/mobile/sessions/${id}`),
      terminateOthers: () => api.del('/api/mobile/sessions/others'),
      loginHistory: (query: Record<string, unknown> = {}) => api.get<Paged<Record<string, any>>>('/api/mobile/login-history', query),
    },
  };
};
