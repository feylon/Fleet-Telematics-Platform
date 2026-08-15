import { useAuthStore, type AuthUser, type TokenPair } from '~/stores/auth';
import { useLiveStore } from '~/stores/live';
import { useApi } from './useApi';
import { homeFor } from '~/utils/roles';

export const useAuth = () => {
  const auth = useAuthStore();
  const api = useApi();
  const config = useRuntimeConfig();

  const login = async (login: string, password: string) => {
    const pair = await $fetch<TokenPair>(`${config.public.apiBase}/api/auth/login`, { method: 'POST', body: { login, password, client: 'web' } });
    auth.setTokens(pair);
    const me = await api.get<AuthUser>('/api/auth/me');
    auth.setUser(me);
    return me;
  };

  const fetchMe = async () => {
    const me = await api.get<AuthUser>('/api/auth/me');
    auth.setUser(me);
    return me;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      return;
    } finally {
      useLiveStore().disconnect();
      useLiveStore().reset();
      auth.clear();
      await navigateTo('/login');
    }
  };

  const changePassword = (currentPassword: string, newPassword: string) => api.post('/api/auth/change-password', { currentPassword, newPassword });

  return { login, fetchMe, logout, changePassword, home: () => homeFor(auth.role) };
};
