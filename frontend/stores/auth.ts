import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface AuthUser {
  id: string;
  login: string;
  role: string;
  organizationId: string | null;
  fullName: string;
  locale: string;
  phone: string | null;
  email: string | null;
  mustChangePassword: boolean;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const AUTH_STORAGE_KEY = 'fleet.auth';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);
  const hydrated = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value));
  const role = computed(() => user.value?.role ?? null);

  const persist = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      if (accessToken.value) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: accessToken.value, refreshToken: refreshToken.value, user: user.value }));
      else localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      return;
    }
  };

  const hydrate = () => {
    if (hydrated.value || typeof localStorage === 'undefined') return;
    hydrated.value = true;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { accessToken: string; refreshToken: string; user: AuthUser | null };
      accessToken.value = parsed.accessToken;
      refreshToken.value = parsed.refreshToken;
      user.value = parsed.user;
    } catch {
      return;
    }
  };

  const setTokens = (pair: TokenPair) => {
    accessToken.value = pair.accessToken;
    refreshToken.value = pair.refreshToken;
    persist();
  };

  const setUser = (value: AuthUser | null) => {
    user.value = value;
    persist();
  };

  const clear = () => {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    persist();
  };

  const decodeRole = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role ?? null;
    } catch {
      return null;
    }
  };

  return { accessToken, refreshToken, user, hydrated, isAuthenticated, role, hydrate, setTokens, setUser, clear, decodeRole };
});
